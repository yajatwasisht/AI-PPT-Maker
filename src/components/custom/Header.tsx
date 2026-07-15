import React, { useContext } from 'react'
import logo from '../../assets/logo.png'
import { Button } from '../ui/button'
import { useUser, SignInButton, UserButton, useAuth } from '@clerk/react'
import { Link, useLocation } from 'react-router-dom'
import { Gem } from 'lucide-react'
import { UserDetailContext } from './../../../context/UserDetailContext'


const MenuOptions = [
  {
    name: 'Workspace',
    path: '/workspace',
  },
  {
    name: 'Pricing',
    path: '/workspace/pricing',
  },
]






function Header() {
  const { user } = useUser();
  const location = useLocation();
  const { userDetail } = useContext(UserDetailContext);
  console.log(location.pathname);
  const {has} = useAuth();
  const hasUnlimitedAccess = has&&has({ plan: 'unlimited' })
  console.log("hasUnlimitedAccess",hasUnlimitedAccess);


  console.log(location.pathname);
    return (
      <div className='flex items-center justify-between px-10 shadow'>
        <img src={logo} alt="logo" width={130} height={130} />
        <ul className='flex items-center gap-10'>
          {MenuOptions.map((menu, index) => (
            <Link to={menu.path} key={index}>
              <h2>{menu.name}</h2>
            </Link>
          ))}
        </ul>
        {!user ? <SignInButton mode="modal">
          <Button>Get Started</Button>
        </SignInButton> :
          <div className='flex items-center gap-5'>
            <UserButton />
            {location.pathname.includes('workspace') ?
            !hasUnlimitedAccess&&
              <div className='flex items-center gap-2 p-2 px-3 rounded-full bg-gray-100'>
                <Gem /> {userDetail?.credits ?? 0}
              </div> :
              <Link to="/workspace">
                <Button>Go to Workspace</Button>
              </Link>}
          </div>}
      </div>
    )
  }

export default Header