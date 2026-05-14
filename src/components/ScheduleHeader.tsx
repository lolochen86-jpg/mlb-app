import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ScheduleHeader.css';

interface Props {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function ScheduleHeader({ selectedDate, onDateChange }: Props) {
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    onDateChange(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="schedule-header glass-panel">
      <button onClick={handlePrevDay} className="nav-btn">
        <ChevronLeft size={24} />
      </button>
      <div className="date-display">
        <h2>{formatDate(selectedDate)}</h2>
        <input 
          type="date" 
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => onDateChange(new Date(e.target.value))}
          className="date-picker-hidden"
        />
      </div>
      <button onClick={handleNextDay} className="nav-btn">
        <ChevronRight size={24} />
      </button>
    </div>
  );
}
