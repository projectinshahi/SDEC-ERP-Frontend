import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Button } from '@/components/Button';

export default function EditBlockerModal() {
  // Placeholder for edit modal
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Blocker</DialogTitle>
        </DialogHeader>
        {/* Form fields go here */}
      </DialogContent>
    </Dialog>
  );
}
