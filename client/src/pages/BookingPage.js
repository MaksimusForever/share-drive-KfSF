// src/pages/BookingPage.js
import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format, isPast, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function BookingPage() {
  const { user } = useAuth();
  const [days, setDays] = useState([]);           // ['Понедельник', 'Вторник', ...]
  const [times, setTimes] = useState([]);         // ['10:00', ...]
  const [notWdays, setNotWdays] = useState([]);   // ['2026-01-01', ...]
  const [bookings, setBookings] = useState([]);   
  const [instructorId, setInstructorId] = useState(null); // Для проверки инструктора
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const maxDate = addDays(today, 21); // ровно 3 недели вперёд

  useEffect(() => {
    Promise.all([
      fetch('/api/days').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/times').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([d, t]) => {
        setDays(d);
        setTimes(t);
      });

    if (user?.id) {
      fetch(`/api/profile/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(r => r.ok ? r.json() : { booking: [], instructorId: null })
        .then(data => {
          setBookings(data.booking || []);
          setInstructorId(data.instructorId || null);
          // Загружаем not_wdays для инструктора, если есть
          if (data.instructorId) {
            fetch(`/api/not-wdays/${data.instructorId}`)
              .then(r => r.ok ? r.json() : [])
              .then(setNotWdays)
              .catch(() => setNotWdays([]));
          }
        })
        .catch(() => {
          setBookings([]);
          setInstructorId(null);
          setNotWdays([]);
        });
    }
  }, [user?.id]);

  if (user?.status !== 'student') {
    return <div className="text-center py-20 text-red-600 text-2xl">Доступ запрещён</div>;
  }

  const isDisabled = (date) => {
    const dayOfWeek = format(date, 'EEEE', { locale: ru });
    const dateStr = format(date, 'yyyy-MM-dd');
    const past = isPast(date);
    const beyondMax = date > maxDate;
    const working = days.includes(dayOfWeek);
    const excluded = notWdays.includes(dateStr);
    return past || beyondMax || !working || excluded;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (!selectedDate || !selectedTime || !selectedPlace) {
      setMessage('Выберите дату, время и место');
      setLoading(false);
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      const res = await fetch(`/api/add-booking/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ date: dateStr, time: selectedTime, place: selectedPlace }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Запись успешно добавлена!');
        setShowModal(false);
        setSelectedDate(undefined);
        setSelectedTime('');
        setSelectedPlace('');
        setBookings(prev => [...prev, { date: dateStr, time: selectedTime, place: selectedPlace }]);
      } else {
        setMessage(data.message || 'Ошибка (возможно слот занят)');
      }
    } catch (err) {
      setMessage('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const upcoming = bookings.filter(b => !isPast(new Date(b.date)));
  const past = bookings.filter(b => isPast(new Date(b.date)));

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Запись на практику</h2>

          {instructorId ? (
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-blue-600 text-white py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition mb-10"
            >
              Записаться на практику
            </button>
          ) : (
            <p className="text-center text-red-600 text-xl mb-10">Инструктор ещё не назначен. Запись недоступна.</p>
          )}

          {/* Списки занятий */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-green-700">Предстоящие занятия</h3>
              {upcoming.length === 0 ? (
                <p className="text-gray-500">Нет предстоящих записей</p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((b, i) => (
                    <li key={i} className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="font-medium">
                        {format(new Date(b.date), 'dd MMMM yyyy', { locale: ru })} в {b.time}
                      </p>
                      <p className="text-sm text-gray-600">Место: {b.place}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-4 text-gray-700">Завершённые занятия</h3>
              {past.length === 0 ? (
                <p className="text-gray-500">Нет завершённых записей</p>
              ) : (
                <ul className="space-y-3">
                  {past.map((b, i) => (
                    <li key={i} className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                      <p className="font-medium">
                        {format(new Date(b.date), 'dd MMMM yyyy', { locale: ru })} в {b.time}
                      </p>
                      <p className="text-sm text-gray-600">Место: {b.place}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модалка с календарём */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">Выберите дату</h3>

            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDisabled}
              fromDate={today}
              toDate={maxDate}
              defaultMonth={today}
              locale={ru}
              modifiers={{
                available: (date) => !isDisabled(date),
              }}
              modifiersClassNames={{
                available: 'bg-white hover:bg-blue-100 text-black rounded cursor-pointer',
                disabled: 'text-gray-400 cursor-not-allowed opacity-50',
                selected: 'bg-blue-600 text-white font-bold',
              }}
              components={{
                IconLeft: ({ ...props }) => {
                  const displayedMonth = props.displayMonth || new Date();
                  const currentMonth = new Date();
                  currentMonth.setDate(1);
                  const isFutureMonth = 
                    displayedMonth.getFullYear() > currentMonth.getFullYear() ||
                    (displayedMonth.getFullYear() === currentMonth.getFullYear() &&
                     displayedMonth.getMonth() > currentMonth.getMonth());

                  return isFutureMonth ? <button {...props}>‹</button> : null;
                },
              }}
              footer={
                selectedDate ? (
                  <p className="text-center mt-4 text-lg font-medium text-green-700">
                    Выбрана: {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
                  </p>
                ) : (
                  <p className="text-center mt-4 text-gray-600">Выберите доступный день</p>
                )
              }
            />

            {selectedDate && (
              <div className="mt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Время</label>
                    <select
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:border-blue-600"
                      required
                    >
                      <option value="">Выберите время</option>
                      {times.map((t, i) => (
                        <option key={i} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Место</label>
                    <select
                      value={selectedPlace}
                      onChange={e => setSelectedPlace(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:border-blue-600"
                      required
                    >
                      <option value="">Выберите место</option>
                      <option value="Атриум">Атриум</option>
                      <option value="БК">БК</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-4 rounded-full font-bold text-lg hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {loading ? 'Запись...' : 'Подтвердить запись'}
                  </button>
                </form>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full bg-red-500 text-white py-4 rounded-full font-bold hover:bg-red-600 transition"
            >
              Закрыть
            </button>

            {message && (
              <p className={`text-center mt-4 text-lg font-medium ${message.includes('успешно') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}