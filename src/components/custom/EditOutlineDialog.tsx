import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

function EditOutlineDialog({ children, outlineData, onUpdate }: any) {
    const [localData, setLocalData] = useState(outlineData);
    const [openDialog, setOpenDialog] = useState(false);
    const handleChange = (field: string, value: string) => {
        setLocalData({ ...localData, [field]: value });
    }

    const handleOpenChange = (open: boolean) => {
        if (open) setLocalData(outlineData);
        setOpenDialog(open);
    }

    const handleUpdate = () => {
        onUpdate(outlineData?.slideNo, localData);
        setOpenDialog(false);
    }


    return (
        <div>
            <Dialog open={openDialog} onOpenChange={handleOpenChange}>
                <DialogTrigger>{children}</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Slide Outline</DialogTitle>
                        <DialogDescription>
                            <div>
                                <label>Slide Title</label>
                                <Input placeholder='Slide Title' 
                                value={localData.slidePoint} 
                                onChange={(event) => handleChange('slidePoint', event.target.value)}
                                />
                                <div className='mt-3'>
                                    <label className='mt-4'>Outline</label>
                                    <Textarea placeholder='Outline'
                                        value={localData.outline} 
                                        onChange={(event) => handleChange('outline', event.target.value)}
                                        />
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose>
                            <Button variant={'outline'}>Close</Button>
                        </DialogClose>
                        <Button onClick={handleUpdate}>Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default EditOutlineDialog