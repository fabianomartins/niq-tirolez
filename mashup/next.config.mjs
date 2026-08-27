/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O bundle do Qlik so faz sentido no browser: enigma.js abre um WebSocket e
  // o stardust manipula o DOM. Mantemos ambos fora do bundle de servidor.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'enigma.js', '@nebula.js/stardust'];
    }
    return config;
  },
};

export default nextConfig;
