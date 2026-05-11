import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyBooks from './pages/MyBooks';
import Wishlist from './pages/Wishlist';
import Explore from './pages/Explore';
import Settings from './pages/Settings';
import MyRequests from './pages/MyRequests';
import ExchangeRequests from './pages/ExchangeRequests';
import Messages from './pages/Messages';
import AddBookForm from './components/Dashboard/AddBookForm';
import BookCircles from './pages/BookCircles';
import CirclePage from './pages/CirclePage';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import AdminRoute from './components/Layout/AdminRoute';
import AdminPanel from './pages/AdminPanel';
import BannedPage from './pages/BannedPage';

// Wrapper: redirect banned users to /banned on every page
const BanGuard = ({ children }) => {
  const { isBanned } = useAuth();
  if (isBanned) return <Navigate to="/banned" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/banned" element={<BannedPage />} />

          {/* Admin — completely separate layout */}
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

          <Route path="/" element={<BanGuard><Layout /></BanGuard>}>
            <Route index element={<Dashboard />} />
            <Route path="explore" element={<Explore />} />
            {/* Protected Routes */}
            <Route path="my-books" element={<ProtectedRoute><MyBooks /></ProtectedRoute>} />
            <Route path="wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="requests" element={<ProtectedRoute><ExchangeRequests /></ProtectedRoute>} />
            <Route path="my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="add-book" element={<ProtectedRoute><AddBookForm /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="circles" element={<ProtectedRoute><BookCircles /></ProtectedRoute>} />
            <Route path="circles/:circleId" element={<ProtectedRoute><CirclePage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

