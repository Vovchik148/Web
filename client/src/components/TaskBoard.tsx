import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

interface Task {
  id: string;
  title: string;
  done: boolean;
}

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Інвентаризація стелажу A (електроніка)', done: false },
  { id: '2', title: 'Перевірити терміни придатності канцелярії', done: false },
  { id: '3', title: 'Замовити поповнення для "Шуруповерт 18V"', done: true },
  { id: '4', title: 'Оглянути іскробезпеку на стелажі B', done: false },
];

// Список перевірок складу з перетягуванням (dnd-kit, рівень 2):
// PointerSensor - миша/дотик, KeyboardSensor - доступність з клавіатури
// (Пробіл - взяти, стрілки - перемістити). Порядок зберігається локально.
export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleDone = (id: string) =>
    setTasks((items) => items.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    // over === null, якщо елемент відпустили поза списком
    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <SortableItem key={task.id} id={task.id}>
              <div className="flex cursor-move items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <span aria-hidden="true" className="text-gray-400">
                  ⠿
                </span>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleDone(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Виконано: ${task.title}`}
                  className="h-4 w-4"
                />
                <span className={task.done ? 'text-gray-400 line-through' : ''}>{task.title}</span>
              </div>
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
