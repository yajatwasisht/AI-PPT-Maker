import { Button } from '../ui/button'
import { Play } from 'lucide-react'
import { HeroVideoDialog } from '../ui/hero-video-dialog'
import { useUser, SignInButton } from '@clerk/react'
import { Link } from 'react-router-dom'

const Hero = () => {

  const { user } = useUser()

  return (
    <div className='flex flex-col items-center justify-center mt-28 space-y-4'>
        <h2 className='text-5xl font-bold'>Describe It. <span className='text-primary'>Generate</span> It. Present It.</h2>
        <p className=' text-lg text-gray-500 max-w-2xl text-center'>Describe your idea, and let AI create beautiful, editable presentations with engaging content, images, charts, and professional designs.</p>
        <div className='flex gap-5 mt-10'>
          <Button variant="outline" size="lg">Watch Video<Play/></Button>
          {!user ? 
          <SignInButton mode="modal">
            <Button size="lg">Get Started</Button>
          </SignInButton>
          : <Link to="/workspace">
            <Button size="lg">Go to Dashboard</Button>
          </Link>}
        </div>
        <div className="relative max-w-2xl mt-10ß">
          <h2 className='text-center my-5'>How it works</h2>
      <HeroVideoDialog
        className="block dark:hidden"
        animationStyle="from-center"
        videoSrc="https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb"
        thumbnailSrc="https://startup-template-sage.vercel.app/hero-light.png"
        thumbnailAlt="Hero Video"
      />
      <HeroVideoDialog
        className="hidden dark:block"
        animationStyle="from-center"
        videoSrc="https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb"
        thumbnailSrc="https://startup-template-sage.vercel.app/hero-dark.png"
        thumbnailAlt="Hero Video"
      />
    </div>
    </div>
  )
}

export default Hero