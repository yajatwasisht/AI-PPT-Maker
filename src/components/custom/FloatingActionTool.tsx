import { Button } from "../ui/button";
import { ArrowRightIcon, Loader2Icon, Sparkles, XIcon } from "lucide-react";
import { Input } from "../ui/input";
import { useState } from "react";

type props = {
    position: { x: number; y: number } | null;
    onClose: () => void;
    handleAiChange: any
    loading?: boolean
};

const FloatingActionTool = ({ position, onClose, handleAiChange, loading }: props) => {

    const[userAiPrompt, setuserAiPrompt]=useState<string>()
    if (!position) return null;

    return (
        <div
            className="fixed z-[100] flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-lg"
            style={{
                top: position.y + 6,
                left: position.x,
                transform: 'translateX(-50%)',
            }}
        >
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <Input type="text" placeholder="Edit with AI"
                    className="outline-none border-none"
                    onChange={(event) => setuserAiPrompt(event.target.value)}
                    disabled={loading} 
                    value={userAiPrompt}
                    />
                {userAiPrompt && 
                <Button variant={'ghost'} size={'icon-sm'}
                onClick={()=>{handleAiChange(userAiPrompt); setuserAiPrompt('');}}>
                    <ArrowRightIcon className="h-4 w-4" />
                </Button>}
                {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                <Button variant={'ghost'} size={'icon-sm'} className="text-neutral-500 hover:text-neutral-700"
                onClick={onClose}> <XIcon className="h-4 w-4" />
            </Button>
            </div>
        </div>
    );
};
export default FloatingActionTool;
