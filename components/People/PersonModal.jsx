import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, Heart, MapPin, Phone, Mail, Calendar, MessageCircle, User, Camera, Upload } from 'lucide-react';

const PersonModal = ({ person, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editData, setEditData] = useState({
    name: person.name || '',
    email: person.email || '',
    phone: person.phone || '',
    location: person.location || '',
    birthday: person.birthday || '',
    relationship: person.relationship || 'friend',
    contact_frequency: person.contact_frequency || 'weekly',
    connection_strength: person.connection_strength || 5,
    notes: person.notes || '',
  });

  const relationships = [
    { value: 'family', label: 'Family' },
    { value: 'best_friend', label: 'Best Friend' },
    { value: 'romantic', label: 'Partner' },
    { value: 'friend', label: 'Friend' },
    { value: 'colleague', label: 'Colleague' },
  ];

  const contactFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'rarely', label: 'Rarely' },
  ];

  useEffect(() => {
    // Fetch profile picture for this person
    const fetchProfilePicture = async () => {
      try {
        const response = await fetch(`https://5004-iufogpj2y1qf67pg0hu0r-3f029ef4.manusvm.computer/api/people/${person.id}/profile-picture`);
        if (response.ok) {
          const data = await response.json();
          setProfilePicture(data);
        }
      } catch (error) {
        console.log('No profile picture found for', person.name);
      }
    };

    fetchProfilePicture();
  }, [person.id]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', '1');
      formData.append('is_profile_picture', 'true');

      const response = await fetch(`https://5004-iufogpj2y1qf67pg0hu0r-3f029ef4.manusvm.computer/api/people/${person.id}/media`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh profile picture
        const profileResponse = await fetch(`https://5004-iufogpj2y1qf67pg0hu0r-3f029ef4.manusvm.computer/api/people/${person.id}/profile-picture`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfilePicture(profileData);
        }
        console.log('Profile picture uploaded successfully');
      } else {
        console.error('Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: person.name || '',
      email: person.email || '',
      phone: person.phone || '',
      location: person.location || '',
      birthday: person.birthday || '',
      relationship: person.relationship || 'friend',
      contact_frequency: person.contact_frequency || 'weekly',
      connection_strength: person.connection_strength || 5,
      notes: person.notes || '',
    });
  };

  const handleSave = async () => {
    try {
      // TODO: Implement API call to update person
      console.log('Saving person data:', editData);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update person:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getRelationshipColor = (relationship) => {
    const colors = {
      family: 'bg-red-100 text-red-800',
      best_friend: 'bg-pink-100 text-pink-800',
      romantic: 'bg-purple-100 text-purple-800',
      friend: 'bg-blue-100 text-blue-800',
      colleague: 'bg-green-100 text-green-800',
    };
    return colors[relationship] || 'bg-gray-100 text-gray-800';
  };

  const renderConnectionHearts = (strength) => {
    return Array.from({ length: 10 }, (_, i) => (
      <Heart
        key={i}
        className={`w-4 h-4 ${
          i < strength 
            ? 'text-red-500 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg max-w-[calc(100vw-16px)] sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600">
                {profilePicture ? (
                  <img 
                    src={`https://5004-iufogpj2y1qf67pg0hu0r-3f029ef4.manusvm.computer/api/people-media/${profilePicture.filename}`}
                    alt={`${person.name}'s profile`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full flex items-center justify-center text-white font-bold text-xl ${profilePicture ? 'hidden' : 'flex'}`}
                >
                  {(isEditing ? editData.name : person.name).charAt(0).toUpperCase()}
                </div>
              </div>
              {isEditing && (
                <div className="absolute -bottom-2 -right-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700 transition-colors">
                      {isUploadingImage ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? editData.name : person.name}
              </h2>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(isEditing ? editData.relationship : person.relationship)}`}>
                {isEditing ? editData.relationship : person.relationship}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{person.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship
              </label>
              {isEditing ? (
                <select
                  value={editData.relationship}
                  onChange={(e) => handleInputChange('relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {relationships.map(rel => (
                    <option key={rel.value} value={rel.value}>{rel.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900 capitalize">{person.relationship.replace('_', ' ')}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{person.email || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{person.phone || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Location and Birthday */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{person.location || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Birthday
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  placeholder="e.g., March 15, 1990"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{person.birthday || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Connection Strength */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Strength
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editData.connection_strength}
                  onChange={(e) => handleInputChange('connection_strength', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>1</span>
                  <span className="font-medium">{editData.connection_strength}/10</span>
                  <span>10</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {renderConnectionHearts(person.connection_strength)}
                </div>
                <span className="text-sm text-gray-600">({person.connection_strength}/10)</span>
              </div>
            )}
          </div>

          {/* Contact Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageCircle className="w-4 h-4 inline mr-2" />
              Contact Frequency
            </label>
            {isEditing ? (
              <select
                value={editData.contact_frequency}
                onChange={(e) => handleInputChange('contact_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {contactFrequencies.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-gray-900 capitalize">{person.contact_frequency}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            {isEditing ? (
              <textarea
                value={editData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Add personal notes about this person..."
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">{person.notes || 'No notes added yet.'}</p>
            )}
          </div>

          {/* Shared Memories */}
          {person.shared_memories !== undefined && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">Shared Memories</h3>
              <p className="text-purple-700">
                You have {person.shared_memories} shared memories with {person.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonModal;

