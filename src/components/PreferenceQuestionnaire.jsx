import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validateUsername } from '../utils/auth';
import { updateCurrentUserProfile } from '../utils/backendApi';

function getBackendMessage(error) {
  return error.message?.replace(/^Backend request failed: \d+\s-\s/, '') || '';
}

export default function PreferenceQuestionnaire({ onComplete, onSkip }) {
  const { accessToken, refreshProfile } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [usernameError, setUsernameError] = useState('');
  const [answers, setAnswers] = useState({
    username: '',
    atmosphere: null,
    primaryUse: null,
    priceRange: null,
    features: [],
    distance: null,
    coffeeStyle: null,
    crowdLevel: null,
    preferredTime: null,
  });

  const questions = [
    {
      id: 'username',
      question: 'Choose a username (optional)',
      type: 'username',
      subtitle: 'This will be shown in the header instead of your email. You can skip or add one later in Profile.',
    },
    {
      id: 'atmosphere',
      question: 'What atmosphere do you prefer?',
      type: 'single',
      options: [
        { value: 'cozy', label: 'Cozy', emoji: '🛋️' },
        { value: 'modern', label: 'Modern', emoji: '✨' },
        { value: 'trendy', label: 'Trendy', emoji: '🎨' },
        { value: 'quiet', label: 'Quiet', emoji: '🤫' },
      ]
    },
    // Primary Use is not needed for the app, so we'll remove it and Money preference is not needed for the app, so we'll remove it
    {
      id: 'features',
      question: 'What features are must-haves?',
      type: 'multiple',
      subtitle: 'Select all that apply',
      options: [
        { value: 'wifi', label: 'WiFi', emoji: '📶' },
        { value: 'parking', label: 'Parking', emoji: '🅿️' },
        { value: 'outdoor', label: 'Outdoor Seating', emoji: '🌳' },
        { value: 'pets', label: 'Pet-Friendly', emoji: '🐕' },
      ]
    },
    {
      id: 'distance',
      question: 'How far are you willing to travel?',
      type: 'single',
      options: [
        { value: 'walking', label: 'Walking Distance', emoji: '🚶', desc: 'Within 1 mile' },
        { value: 'short-drive', label: 'Short Drive', emoji: '🚗', desc: 'Within 5 miles' },
        { value: 'any', label: 'Any Distance', emoji: '🌍', desc: 'Worth the trip' },
      ]
    },
    {
      id: 'coffeeStyle',
      question: 'What\'s your go-to coffee style?',
      type: 'single',
      options: [
        { value: 'espresso', label: 'Espresso Drinks', emoji: '☕' },
        { value: 'drip', label: 'Drip/Pour Over', emoji: '🫖' },
        { value: 'specialty', label: 'Specialty Drinks', emoji: '🍹' },
        { value: 'any', label: 'I Love It All', emoji: '💖' },
      ]
    },
    // How busy the cafe is not needed for the app, so we'll remove it
    {
      id: 'preferredTime',
      question: 'Do you usually visit cafes during the day or night?',
      type: 'multiple',
      options: [
        { value: 'morning', label: 'Morning', emoji: '🌅', desc: '6am-11am' },
        { value: 'afternoon', label: 'Afternoon', emoji: '☀️', desc: '11am-5pm' },
        { value: 'evening', label: 'Evening', emoji: '🌙', desc: '5pm-close' },
        { value: 'flexible', label: 'Flexible', emoji: '⏰', desc: 'Anytime' },
      ]
    },
  ];

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleSelectOption = (questionId, value) => {
    if (currentQ.type === 'multiple') {
      // Toggle selection for multi-select
      const current = answers[questionId] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [questionId]: updated });
    } else {
      // Single select
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSave = async () => {
    try {
      const { username, ...preferences } = answers;
      const updateData = {
        preferences,
        questionnaireCompleted: true,
      };
      if (username?.trim()) {
        const err = validateUsername(username.trim());
        if (err) {
          setUsernameError(err);
          return;
        }
        updateData.username = username.trim();
      }
      await updateCurrentUserProfile(accessToken, updateData);
      await refreshProfile();

      if (onComplete) {
        onComplete(answers);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      const message = getBackendMessage(error);
      if (message.includes('username')) {
        setUsernameError(message);
        setCurrentQuestion(0);
        return;
      }
      alert('Failed to save preferences. Please try again.');
    }
  };

  const canProceed = () => {
    if (currentQ.type === 'username') {
      return true; // Username is optional
    }
    const answer = answers[currentQ.id];
    if (currentQ.type === 'multiple') {
      return true; // Multi-select can be empty
    }
    return answer !== null && answer !== undefined;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '2.5rem',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
      >
        {/* Progress Bar */}
        <div style={{
          marginBottom: '2rem',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            color: '#8D7B6D',
          }}>
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#E5E0DC',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6F4E37 0%, #B8935E 100%)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Question Title */}
        <h2 style={{
          fontSize: '1.8rem',
          color: '#6F4E37',
          marginBottom: '0.5rem',
          fontFamily: "'Playfair Display', serif",
          textAlign: 'center',
        }}>
          {currentQ.question}
        </h2>

        {currentQ.subtitle && (
          <p style={{
            textAlign: 'center',
            color: '#8D7B6D',
            fontSize: '0.95rem',
            marginBottom: '2rem',
          }}>
            {currentQ.subtitle}
          </p>
        )}

        {/* Username input (special type) */}
        {currentQ.type === 'username' ? (
          <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
            <input
              type="text"
              value={answers.username || ''}
              onChange={(e) => {
                setAnswers({ ...answers, username: e.target.value });
                setUsernameError('');
              }}
              placeholder="e.g. coffee_lover"
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                fontSize: '1.1rem',
                border: usernameError ? '2px solid #dc2626' : '2px solid #E5E0DC',
                borderRadius: '12px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6F4E37';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = usernameError ? '#dc2626' : '#E5E0DC';
              }}
            />
            {usernameError && (
              <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '0.5rem' }}>{usernameError}</p>
            )}
          </div>
        ) : (
        /* Options */
        <div style={{
          display: 'grid',
          gap: '1rem',
          marginTop: '2rem',
          marginBottom: '2rem',
        }}>
          {currentQ.options?.map((option) => {
            const isSelected = currentQ.type === 'multiple'
              ? (answers[currentQ.id] || []).includes(option.value)
              : answers[currentQ.id] === option.value;

            return (
              <button
                key={option.value}
                onClick={() => handleSelectOption(currentQ.id, option.value)}
                style={{
                  padding: '1.25rem',
                  border: isSelected ? '2px solid #6F4E37' : '2px solid #E5E0DC',
                  background: isSelected ? '#FFF8E7' : 'white',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#B8935E';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#E5E0DC';
                  }
                }}
              >
                <span style={{ fontSize: '2rem' }}>{option.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#6F4E37',
                    marginBottom: option.desc ? '0.25rem' : 0,
                  }}>
                    {option.label}
                  </div>
                  {option.desc && (
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#8D7B6D',
                    }}>
                      {option.desc}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <span style={{ fontSize: '1.5rem', color: '#6F4E37' }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
        )}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          marginTop: '2rem',
        }}>
          {currentQuestion > 0 ? (
            <button
              onClick={handleBack}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: '2px solid #E5E0DC',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#8D7B6D',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6F4E37';
                e.currentTarget.style.color = '#6F4E37';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E0DC';
                e.currentTarget.style.color = '#8D7B6D';
              }}
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={onSkip}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#8D7B6D',
                fontWeight: '500',
                textDecoration: 'underline',
              }}
            >
              Skip for now
            </button>
          )}

          {isLastQuestion ? (
            <button
              onClick={handleSave}
              disabled={!canProceed()}
              style={{
                padding: '0.75rem 2rem',
                background: canProceed() ? '#6F4E37' : '#E5E0DC',
                border: 'none',
                borderRadius: '8px',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                color: 'white',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (canProceed()) {
                  e.currentTarget.style.background = '#5A3D2D';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (canProceed()) {
                  e.currentTarget.style.background = '#6F4E37';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              Save Preferences ✓
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                padding: '0.75rem 2rem',
                background: canProceed() ? '#6F4E37' : '#E5E0DC',
                border: 'none',
                borderRadius: '8px',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                color: 'white',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (canProceed()) {
                  e.currentTarget.style.background = '#5A3D2D';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (canProceed()) {
                  e.currentTarget.style.background = '#6F4E37';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              Next →
            </button>
          )}
        </div>

        {/* Header */}
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          left: '2.5rem',
          right: '2.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☕</div>
          <h3 style={{
            fontSize: '1.2rem',
            color: '#6F4E37',
            fontWeight: '600',
            fontFamily: "'Playfair Display', serif",
          }}>
            Help us find your perfect cafe
          </h3>
        </div>
      </div>
    </div>
  );
}
