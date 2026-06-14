import { HeroSection }   from '@/components/sections/HeroSection'
import { QuotesSection } from '@/components/sections/QuotesSection'
import { MenuSection }   from '@/components/sections/MenuSection'
import { AboutSection }  from '@/components/sections/AboutSection'
import { VideoSection }  from '@/components/sections/VideoSection'
import { LoveScene }     from '@/components/sections/LoveScene'
import { NewsletterSignup } from '@/components/sections/NewsletterSignup'
import { FooterSection } from '@/components/sections/FooterSection'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <QuotesSection />
      <MenuSection />
      <AboutSection />
      <VideoSection />
      <LoveScene />
      <NewsletterSignup />
      <FooterSection />
    </>
  )
}
