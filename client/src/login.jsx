import React, { useState } from 'react';
import axios from 'axios';
import { FaUser, FaLock, FaEnvelope, FaEye, FaEyeSlash } from 'react-icons/fa';
import loginIllustration from './assets/Login-rafiki.svg'; 
import signupIllustration from './assets/Sign up-pana.svg';
import './Auth.css';

const AuthPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ 
        email: '', 
        user_name: '', 
        password: '', 
        confirmPassword: ''
    });
    const [error, setError] = useState("");

    const handleInputFocus = () => {
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Basic Password Match Validation for Signup
        if (!isLogin && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        try {
            const url = isLogin ? 'http://localhost:5000/api/login' : 'http://localhost:5000/api/register';
            
            const payload = isLogin 
                ? { user_name: formData.user_name, password: formData.password }
                : { user_name: formData.user_name, email: formData.email, password: formData.password };

            const res = await axios.post(url, payload);
            
            if (isLogin) {
                // Ensure the backend response contains the necessary session keys
                if (res.data.sessionId && res.data.user) {
                    localStorage.setItem('sessionId', res.data.sessionId);
                    localStorage.setItem('userName', res.data.user.user_name || res.data.user.name);
                    localStorage.setItem('userId', res.data.user.id);
                    
                    // Call the onLogin prop to update App's state
                    onLogin();
                } else {
                    setError("Login successful, but session data is missing.");
                }
            } else {
                // Handle Signup Success
                alert("Registration successful! Please login.");
                setIsLogin(true);
                setFormData({ email: '', user_name: '', password: '', confirmPassword: '' });
            }
        } catch (err) {
            const serverError = err.response?.data?.error || "Connection to server failed.";
            setError(serverError);
        }
    };

    return (
        <div className="auth-main-container">
            <div className="auth-split-card">
                {/* Left Side: Illustration */}
                <div className="auth-illustration">
                    <img src={isLogin ? loginIllustration : signupIllustration} alt="Auth Illustration" />
                </div>

                {/* Right Side: Form Section */}
                <div className="auth-form-section">
                    <div className="auth-logo">Exportdoc</div>
                    
                    <h2 className="form-title">{isLogin ? "Login" : "Create an account"}</h2>
                    
                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="input-group">
                                <input 
                                    type="email" 
                                    placeholder="Email" 
                                    required 
                                    value={formData.email}
                                    onFocus={handleInputFocus}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                />
                                <FaEnvelope className="input-icon" />
                            </div>
                        )}
                        
                        <div className="input-group">
                            <input 
                                type="text" 
                                placeholder="Username" 
                                required 
                                value={formData.user_name}
                                onFocus={handleInputFocus}
                                onChange={(e) => setFormData({...formData, user_name: e.target.value})} 
                            />
                            <FaUser className="input-icon" />
                        </div>

                        <div className="input-group">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Password" 
                                required 
                                value={formData.password}
                                onFocus={handleInputFocus}
                                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                            />
                            <FaLock className="input-icon" />
                            <span className="view-toggle" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <FaEye /> : <FaEyeSlash />}
                            </span>
                        </div>

                        {!isLogin && (
                            <div className="input-group">
                                <input 
                                    type="password" 
                                    placeholder="Confirm password" 
                                    required 
                                    value={formData.confirmPassword}
                                    onFocus={handleInputFocus}
                                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                                />
                                <FaLock className="input-icon" />
                            </div>
                        )}

                        {error && <p className="error-text" style={{ color: 'red', fontSize: '0.85rem', marginBottom: '10px' }}>{error}</p>}
                        
                        <button className="auth-submit-btn" type="submit">
                            {isLogin ? "LOGIN" : "SIGN UP"}
                        </button>
                    </form>

                    <div className="navigation-footer">
                        <p className="toggle-auth" onClick={() => {
                            setIsLogin(!isLogin);
                            setError(""); 
                        }}>
                            {isLogin ? "Don't have an account? Register here!" : "Already have an account? Sign in"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;