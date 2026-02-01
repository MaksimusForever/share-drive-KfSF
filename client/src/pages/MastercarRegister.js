import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Cropper from 'react-easy-crop';
import { useDropzone } from 'react-dropzone';
import getCroppedImg from '../utils/cropImage'; // Утилита для обрезки
import validator from 'validator'; // Для валидации

export default function MastercarRegister() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    experience: ''
  });
  const [image, setImage] = useState(null); // Для preview (base64)
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.status !== 'staff') {
    return <div className="text-center py-20 text-red-600 text-2xl">Доступ запрещён</div>;
  }

  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      setImage(croppedImage); // Обрезанное base64
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      setMessage('Ошибка обрезки изображения');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    // Валидация
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password) {
      setMessage('Заполните все обязательные поля');
      setLoading(false);
      return;
    }
    if (!validator.isEmail(form.email)) {
      setMessage('Неверный email');
      setLoading(false);
      return;
    }
    if (!validator.isMobilePhone(form.phone)) {
      setMessage('Неверный телефон');
      setLoading(false);
      return;
    }
    if (form.experience && isNaN(Number(form.experience))) {
      setMessage('Стаж должен быть числом');
      setLoading(false);
      return;
    }

    const submitForm = new FormData();
    Object.entries(form).forEach(([key, value]) => submitForm.append(key, value.trim()));
    if (image) {
      // Base64 to Blob
      const response = await fetch(image);
      const blob = await response.blob();
      submitForm.append('photo', blob, 'avatar.jpg');
    }

    try {
      const res = await fetch('/api/register-mastercar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: submitForm
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Инструктор успешно зарегистрирован');
        setForm({ firstName: '', lastName: '', middleName: '', email: '', phone: '', password: '', address: '', experience: '' });
        setImage(null);
      } else {
        setMessage(data.message || 'Ошибка регистрации');
      }
    } catch (err) {
      setMessage('Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Регистрация инструктора</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Имя"
                value={form.firstName}
                onChange={e => setForm({...form, firstName: e.target.value})}
                className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Фамилия"
                value={form.lastName}
                onChange={e => setForm({...form, lastName: e.target.value})}
                className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Отчество"
                value={form.middleName}
                onChange={e => setForm({...form, middleName: e.target.value})}
                className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
              />
            </div>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
              required
            />
            <input
              type="tel"
              placeholder="Телефон"
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Адрес"
              value={form.address}
              onChange={e => setForm({...form, address: e.target.value})}
              className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Стаж инструкторства (лет)"
              value={form.experience}
              onChange={e => setForm({...form, experience: e.target.value})}
              className="w-full px-4 py-3 border rounded-lg focus:border-blue-600 focus:outline-none"
              min="0"
            />

            {/* Dropzone для аватара */}
            <div {...getRootProps()} className="border-2 border-dashed p-4 rounded-lg text-center cursor-pointer hover:border-blue-600 transition">
              <input {...getInputProps()} />
              <p>Перетащите фото аватара или кликните для выбора (jpg/png)</p>
              {image && !showCropper && <img src={image} alt="Preview" className="mt-2 max-h-40 mx-auto rounded-full object-cover" />}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-full font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Регистрация...' : 'Зарегистрировать инструктора'}
            </button>
          </form>

          {/* Modal для cropper */}
          {showCropper && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded-lg w-11/12 md:w-96">
                <div className="relative w-full h-64 mb-4">
                  <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    aspect={1} // Круглый аватар (1:1)
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <button
                  onClick={handleCrop}
                  className="w-full bg-green-600 text-white py-2 rounded-full font-bold hover:bg-green-700 transition"
                >
                  Обрезать и сохранить
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className={`text-center mt-6 text-xl font-medium ${message.includes('успешно') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}