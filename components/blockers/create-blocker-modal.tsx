"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  project: z.string().min(1),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  helpNeededFrom: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateBlockerModal({ children }: { children: React.ReactNode }) {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const onSubmit = (data: FormData) => {
    // TODO: API call
  };
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log New Blocker</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <input {...form.register('title')} placeholder="Title" className="input" />
          <textarea {...form.register('description')} placeholder="Description" className="input" />
          <input {...form.register('project')} placeholder="Project" className="input" />
          <select {...form.register('severity')} className="input">
            <option value="">Select Severity</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <input {...form.register('helpNeededFrom')} placeholder="Need Help From" className="input" />
          <Button type="submit" className="w-full mt-2">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
