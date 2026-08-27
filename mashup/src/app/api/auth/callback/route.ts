import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RespostaToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * Retorno do IdP do Qlik. Troca o authorization code por token e grava o token
 * em cookie httpOnly.
 *
 * O access_token NUNCA é devolvido no corpo da resposta nem exposto ao
 * JavaScript da página. O browser o envia automaticamente no handshake do
 * WebSocket do Engine; o front nunca precisa lê-lo.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const erroIdp = url.searchParams.get('error');

  const jar = await cookies();
  const verifier = jar.get('ppt_pkce_verifier')?.value;
  const stateEsperado = jar.get('ppt_oauth_state')?.value;
  const destino = jar.get('ppt_post_login')?.value ?? '/overview';

  // Limpa os cookies de uso único antes de qualquer decisão.
  jar.delete('ppt_pkce_verifier');
  jar.delete('ppt_oauth_state');
  jar.delete('ppt_post_login');

  if (erroIdp) {
    return NextResponse.json({ erro: `Autenticação recusada pelo Qlik: ${erroIdp}` }, { status: 401 });
  }
  if (!code || !state || !verifier) {
    return NextResponse.json({ erro: 'Retorno de autenticação incompleto.' }, { status: 400 });
  }
  // Comparação de state: defesa contra CSRF no fluxo de autorização.
  if (state !== stateEsperado) {
    return NextResponse.json({ erro: 'State inválido — possível CSRF. Refaça o login.' }, { status: 400 });
  }

  const tenant = process.env.NEXT_PUBLIC_QLIK_TENANT;
  const clientId = process.env.NEXT_PUBLIC_QLIK_OAUTH_CLIENT_ID;
  const clientSecret = process.env.QLIK_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.QLIK_OAUTH_REDIRECT_URI;

  if (!tenant || !clientId || !redirectUri) {
    return NextResponse.json({ erro: 'OAuth não configurado.' }, { status: 500 });
  }

  const corpo = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  // Client confidencial (quando o app OAuth do tenant exige segredo).
  if (clientSecret) corpo.set('client_secret', clientSecret);

  const resposta = await fetch(`https://${tenant}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
    cache: 'no-store',
  });

  const dados = (await resposta.json()) as RespostaToken;

  if (!resposta.ok || !dados.access_token) {
    return NextResponse.json(
      { erro: dados.error_description ?? dados.error ?? 'Falha ao obter token.' },
      { status: 401 },
    );
  }

  const maxAge = Math.max(60, (dados.expires_in ?? 3600) - 60);
  jar.set('ppt_access_token', dados.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  if (dados.refresh_token) {
    jar.set('ppt_refresh_token', dados.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  // Redirect relativo: nunca confiar em `next` absoluto vindo de fora
  // (open redirect é o jeito mais barato de roubar um token OAuth).
  const caminho = destino.startsWith('/') && !destino.startsWith('//') ? destino : '/overview';
  return NextResponse.redirect(new URL(caminho, url.origin));
}
