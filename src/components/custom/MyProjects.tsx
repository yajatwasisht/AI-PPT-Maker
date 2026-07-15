import { Button } from '@/components/ui/button'
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { ArrowRight, FolderIcon } from 'lucide-react'
import { useEffect, useState } from 'react';
import type { Project } from '../../workspace/project/outline';
import { fireBaseDb } from './../../../config/FirebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useUser } from '@clerk/react';
import PPT_ICON from './../../assets/ppt.png';
import moment from 'moment';
import { Link } from 'react-router-dom';

function MyProjects() {


    const [projects, setProjects] = useState<Project[]>();
    const { user } = useUser();


    useEffect(() => {
        user && getProjects();
    }, [user]);




    const getProjects = async () => {
        const q = query(collection(fireBaseDb, "projects"),
            where("createdBy", "==", user?.primaryEmailAddress?.emailAddress ?? ''));
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map((doc) => doc.data() as Project);
        setProjects(list);
    };

    const formatDate = (timestamp: any) => {
        const formateDate = moment(timestamp).fromNow();
        return formateDate;
    }


    return (
        <div className='mx-32 mt-21'>
            <div className='flex justify-between items-center'>
                <h2 className='font-bold text-2xl'>MyProjects</h2>
                <Button>+ Create New Project</Button>
            </div>
            <div>
                {!projects?.length ? <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FolderIcon />
                        </EmptyMedia>
                        <EmptyTitle>No Projects Yet</EmptyTitle>
                        <EmptyDescription>
                            You haven&apos;t created any projects yet. Get started by creating
                            your first project.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center gap-2">
                        <Button>Create Project</Button>
                        {/* <Button variant={'outline'}>Import Project</Button> */}
                    </EmptyContent>
                    <Button variant="link" className="text-muted-foreground"
                        size="sm" nativeButton={false}
                        render={<a href="#">Learn More <ArrowRight /></a>} />
                </Empty>
                :<div className='grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 mt-5'>
                    {projects?.map((project,index) => (
                        <Link to={`/workspace/project/${project?.projectId}/editor`} key={index}>
                        <div key={index} className='border rounded-2xl p-4 shadow space-y-1'>
                            <img src={PPT_ICON} width={50} height={50}/>
                            <h2 className='text-lg font-bold'> {project?.userInputPrompt}</h2>
                            <h2 className='text-red-600 text-gray-500'>Total {project?.slides?.length} Slides</h2>
                            <p className='text-gray-400'>{formatDate(project?.createdAt)}</p>
                        </div>
                        </Link>
                    ))}
                </div>}
                </div>
        </div>
    )
}

export default MyProjects