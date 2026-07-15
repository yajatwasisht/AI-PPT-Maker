import { useState } from 'react'
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
} from "@/components/ui/input-group"
import { ArrowUp, Loader2Icon } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { v4 as uuidv4 } from 'uuid';
import { fireBaseDb } from './../../../config/FirebaseConfig';
import { setDoc } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import { useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

function PromptBox() {

    const [userInput,setUserInput]=useState<string>();
    const [noOfSliders,setNoOfSliders]=useState<string>('4 - 6 slides');
    const {user}=useUser();
    const [loading,setLoading]=useState(false);
    const navigate=useNavigate();
    const CreateAndSaveProject=async()=>{
        const projectId=uuidv4();
        setLoading(true);
        await setDoc(doc(fireBaseDb,'projects',projectId),{
            projectId:projectId,
            userInputPrompt:userInput,
            createdBy:user?.primaryEmailAddress?.emailAddress,
            createdAt:Date.now(),
            noOfSliders:noOfSliders
        });    
        setLoading(false);
        navigate(`/workspace/project/${projectId}/outline`);
    }

    const items = [
        { label: "Select No. Of Slides", value: null },
        { label: "4 - 6 slides", value: "4 - 6 slides" },
        { label: "7 - 9 slides", value: "7 - 9 slides" },
        { label: "10 - 12 slides", value: "10 - 12 slides" },
        { label: "13 - 15 slides", value: "13 - 15 slides" },
        { label: "16 - 18 slides", value: "16 - 18 slides" },
        { label: "19 - 21 slides", value: "19 - 21 slides" },
      ]
    return (
        <div className='w-full flex items-center justify-center mt-25'>
            <div className='flex flex-col items-center justify-center space-y-4'>
                <h2 className='text-4xl font-bold'>Describe your <span className='text-primary'>PPT</span> in detail, we will develop it for you</h2>
                <p className=' text-xl text-gray-500'>Your ppt will be saved in your workspace</p>

                <InputGroup>
                    <InputGroupTextarea placeholder='Describe your ppt in detail' 
                    className='min-h-40' 
                    onChange={(event)=>setUserInput(event.target.value)}
                    />
                    <InputGroupAddon align={'block-end'}>
                        {/* <InputGroupButton>
                            <PlusIcon />
                        </InputGroupButton> */}
                        <Select 
                        items={items}
                        onValueChange={(value) => {
                          if (typeof value === 'string') setNoOfSliders(value);
                        }}
                        >
                            <SelectTrigger className="w-full max-w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>No. Of Slides</SelectLabel>
                                    {items.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputGroupButton
                        variant={'default'}
                        className='rounded-full ml-auto'
                        size={'icon-sm'}
                        onClick={()=>CreateAndSaveProject()}
                        disabled={!userInput}
                        >
                            {loading ? <Loader2Icon className='animate-spin' /> : <ArrowUp />}
                        </InputGroupButton>                        
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </div>
    )
}

export default PromptBox