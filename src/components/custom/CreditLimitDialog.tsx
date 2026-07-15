import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Link } from "react-router-dom";

type Props = {
        openAlert: boolean;
        setOpenAlert: any;
    }

function CreditLimitDialog({openAlert,setOpenAlert}: Props) {
    return (
    <AlertDialog open={openAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>OOPS!!!</AlertDialogTitle>
                <AlertDialogDescription>
                    You have reached your credit limit. Please upgrade to continue.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={()=>setOpenAlert(false)}>Cancel</AlertDialogCancel>
                <Link to="/workspace/pricing">
                <AlertDialogAction>Pricing</AlertDialogAction>
                </Link>

            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    )
}

export default CreditLimitDialog