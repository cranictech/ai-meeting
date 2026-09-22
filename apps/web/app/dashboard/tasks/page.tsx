'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { actionItemsApi, type ActionItem } from '@/lib/api';

export default function TasksPage() {
  const router = useRouter();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await actionItemsApi.getUserItems();
      setActionItems(response.data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = actionItems.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await actionItemsApi.updateStatus(id, newStatus);
      await loadTasks();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    const dueDate = new Date(dateString);
    const today = new Date();
    return dueDate < today;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/dashboard/meetings')}
                className="text-gray-700 hover:text-gray-900"
              >
                Meetings
              </button>
            </div>
            <h1 className="text-xl font-semibold">Tasks</h1>
            <div className="w-16" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <div className="text-gray-500 mb-4">
              {filter === 'all' ? 'No tasks yet' : `No ${filter.replace('_', ' ')} tasks`}
            </div>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/dashboard/meetings/new')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Create a Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((item) => (
              <div
                key={item.id}
                className="bg-white border rounded-lg p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-lg mb-2">{item.task}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {item.assignee && (
                        <span>Assigned to: {item.assignee}</span>
                      )}
                      {item.due_date && (
                        <span className={isOverdue(item.due_date) ? 'text-red-600' : ''}>
                          Due: {formatDate(item.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority}
                    </span>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="px-3 py-1 border rounded-lg text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}