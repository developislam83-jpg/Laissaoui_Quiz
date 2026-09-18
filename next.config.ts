import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/ar',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
