import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ["/admin", "/dashboard", "/domains", "/enrollments", "/groups", "/modules", "/profile", "/professors", "/rooms", "/schedule", "/sections", "/students", "/users"],
  professor: ["/professor", "/profile"],
  student: ["/student", "/profile"],
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPublicPage =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/login");

  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const path = request.nextUrl.pathname;
    const allowedRoutes = profile ? ROLE_ROUTES[profile.role] ?? [] : [];

    const isAllowed = allowedRoutes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
    const isNeutral = !path.startsWith("/admin") && !path.startsWith("/professor") && !path.startsWith("/student");

    if (!isAllowed && !isNeutral) {
      const dashboard = profile?.role === "admin" ? "/dashboard" : profile?.role === "professor" ? "/professor/dashboard" : "/student/dashboard";
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
  }

  return supabaseResponse;
}
