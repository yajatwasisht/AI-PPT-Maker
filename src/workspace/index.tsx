import { useEffect, useContext } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { fireBaseDb } from '../../config/FirebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { UserDetailContext } from '../../context/UserDetailContext.tsx'
import Header from '../components/custom/Header.tsx'
import { Button } from '../components/ui/button'
import PromptBox from '../components/custom/PromptBox.tsx'
import MyProjects from '@/components/custom/MyProjects.tsx'

function Workspace() {
  const { user, isLoaded } = useUser()
  const { userDetail, setUserDetail } = useContext(UserDetailContext)
  const location = useLocation();
  useEffect(() => {
    user && CreateNewUser()
  }, [user])

  const CreateNewUser = async () => {
    if (user) {
    //if user already exists
    const docRef = doc(fireBaseDb, "users", user?.primaryEmailAddress?.emailAddress??'');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      setUserDetail(docSnap.data());
    } else {
      const data = {
        fullName: user?.fullName,
        email: user?.primaryEmailAddress?.emailAddress,
        createdAt: new Date(),
        credits: 2,
      }
      //add new user
      await setDoc(doc(fireBaseDb, "users", 
        user?.primaryEmailAddress?.emailAddress??''), {
          ...data,
        });
      setUserDetail(data);
    }
  }
  };

  if (!user && !isLoaded) {
    return <div>Please login to continue
    <Link to="/"><Button>Login</Button></Link></div>
  }
  return (
    <div>
      <Header />
      {location.pathname==='/workspace' && <div>
        <PromptBox />
        <MyProjects />
      </div>}
      <Outlet />
    </div>
  )
}

export default Workspace