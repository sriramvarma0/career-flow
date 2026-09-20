export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/applications/:path*", "/profile", "/settings"],
};