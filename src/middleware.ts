import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const protectedPaths = ["/decks", "/settings", "/community", "/dashboard"];
      const isProtected = protectedPaths.some((path) =>
        req.nextUrl.pathname.startsWith(path)
      );
      if (isProtected) return !!token;
      return true;
    },
  },
});

export const config = {
  matcher: ["/decks/:path*", "/settings/:path*", "/community/:path*", "/dashboard/:path*"],
};
