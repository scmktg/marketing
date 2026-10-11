import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";
import "./globals.css";
const geist=Geist({subsets:["latin"],display:"swap"});
export const metadata:Metadata={metadataBase:new URL(site.url),title:{default:"Stevens Marketing | Marketing measured by results",template:"%s | Stevens Marketing"},description:"Research-led marketing, hands-on execution and performance-based remuneration. Stevens Marketing works with Australian businesses to pursue measurable commercial growth.",alternates:{canonical:"/"},openGraph:{type:"website",siteName:"Stevens Marketing",title:"Marketing measured by results.",description:"We research, build and optimise marketing strategies designed to grow your business.",url:"/"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-AU"><body className={geist.className}><SiteHeader/><main id="main">{children}</main><SiteFooter/></body></html>}
