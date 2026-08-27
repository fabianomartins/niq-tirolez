import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Início do fluxo OAuth2 Authorization Code + PKCE contra o Qlik Cloud.
 *
 * PKCE não é opcional aqui: o mashup é um cliente público (roda no browser do
 * distribuidor). Sem o code_verifier, um código interceptado no redirect vira
 * um token válido para a carteira inteira daquele usuário.
 *
 * O verifier e o state ficam em cookie httpOnly — inacessíveis ao JavaScript
 * da página, inclusive a scripts de terceiros que venham a ser injetados.
 */
export async function GET(request: Request) {
  const tenant = process.env.NEXT_PUBLIC_QLIK_TENANT;
  const clientId = process.env.NEXT_PUBLIC_QLIK_OAUTH_CLIENT_ID;
  const redirectUri = process.env.QLIK_OAUTH_REDIRECT_URI;

  if (!tenant || !clientId || !redirectUri) {
    return NextResponse.json(
      { erro: 'OAuth não configurado. Verifique NEXT_PUBLIC_QLIK_TENANT, NEXT_PUBLIC_QLIK_OAUTH_CLIENT_ID e QLIK_OAUTH_REDIRECT_URI.' },
      { status: 500 },
    );
  }

  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const state = base64url(randomBytes(24));

  // Para onde voltar depois do login.
  const destino = new URL(request.url).searchParams.get('next') ?? '/overview';

  const jar = await cookies();
  const opcoes = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
  jar.set('ppt_pkce_verifier', verifier, opcoes);
  jar.set('ppt_oauth_state', state, opcoes);
  jar.set('ppt_post_login', destino, opcoes);

  const authorize = new URL(`https://${tenant}/oauth/authorize`);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'user_default');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(authorize.toString());
}
