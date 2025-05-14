import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { eventsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const AdminEventEdit: React.FC = () => {
    const { state } = useLocation() as { state: { event: any } };
    const navigate = useNavigate();
    const { id } = useParams();

    const initial = state?.event ?? {};

    const [form, setForm] = useState({
        event_name: initial.event_name || '',
        description: initial.description || '',
        event_date: (initial.event_date || '').slice(0, 10),
        event_time: initial.event_time || '',
        venue:      initial.venue      || '',
        priority:   initial.priority   || 'normal',
        status:     initial.status     || 'pending',
    });

    const handleChange =
        (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            setForm({ ...form, [k]: e.target.value });

    const submit = async () => {
        try {
            await eventsAPI.updateEvent(id!, {
                ...form,
                event_date: new Date(form.event_date).toISOString(),
            });
            toast.success('Event updated');
            navigate('/admin/events');
        } catch {
            toast.error('Update failed');
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Edit Event</h1>
                <Button variant="outline" onClick={() => navigate('/admin')}>
                    Back to Dashboard
                </Button>
            </div>

            <div>
                <Label>Title</Label>
                <Input value={form.event_name} onChange={handleChange('event_name')} />
            </div>

            <div>
                <Label>Description</Label>
                <Textarea rows={4} value={form.description} onChange={handleChange('description')} />
            </div>

            <div className="flex space-x-4">
                <div className="flex-1">
                    <Label>Date</Label>
                    <Input type="date" value={form.event_date} onChange={handleChange('event_date')} />
                </div>
                <div className="flex-1">
                    <Label>Time</Label>
                    <Input type="time" value={form.event_time} onChange={handleChange('event_time')} />
                </div>
            </div>

            <div>
                <Label>Venue</Label>
                <Input value={form.venue} onChange={handleChange('venue')} />
            </div>

            <div className="flex space-x-4">
                <div className="flex-1">
                    <Label>Priority</Label>
                    <select className="w-full border rounded px-2 py-1" value={form.priority} onChange={handleChange('priority')}>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                        <option value="high">High</option>
                        <option value="mandatory">Mandatory</option>
                    </select>
                </div>

                <div className="flex-1">
                    <Label>Status</Label>
                    <select className="w-full border rounded px-2 py-1" value={form.status} onChange={handleChange('status')}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => navigate('/admin/events')}>Cancel</Button>
                <Button onClick={submit}>Save</Button>
            </div>
        </div>
    );
};

export default AdminEventEdit;
