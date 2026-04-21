import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  Camera,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Building2,
  AlertCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { fetchProfile, updateProfile, uploadMedia } from '../services/api';
import { useFacultyExams } from '../hooks/useFacultyExams';

// -- Inner components defined BEFORE the main component --

function ProfileField({ icon: Icon, label, value, name, type = 'text', isEditing, onChange, readOnly, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] xs:text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3 h-3 xs:w-3.5 xs:h-3.5 flex-shrink-0" />
        {label}
      </label>
      {isEditing && !readOnly ? (
        <input
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900"
        />
      ) : (
        <div className="text-sm sm:text-base text-gray-900 font-semibold py-1.5 px-0.5 break-words">
          {value || <span className="text-gray-300 font-normal italic text-sm">Not provided</span>}
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color, wide = false }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  if (wide) {
    // Stacked layout for long values (e.g. enrollment number)
    return (
      <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-medium text-gray-500 text-xs sm:text-sm uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-gray-900 pl-1 break-all">{value}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl gap-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <span className="font-medium text-gray-700 text-sm sm:text-base">{label}</span>
      </div>
      <span className="text-lg sm:text-xl font-bold text-gray-900 flex-shrink-0">{value}</span>
    </div>
  );
}

function FacultyStats() {
  const { stats } = useFacultyExams();
  return (
    <>
      <StatItem label="Exams Created"   value={stats?.totalExams    || 0} icon={BookOpen}     color="blue"   />
      <StatItem label="Total Students"  value={stats?.totalStudents || 0} icon={Users}         color="indigo" />
      <StatItem label="Active Exams"    value={stats?.activeExams   || 0} icon={CheckCircle2} color="green"  />
      <StatItem label="Avg Submissions" value={stats?.avgSubmissions|| 0} icon={TrendingUp}   color="purple" />
    </>
  );
}

function StudentStats({ profile }) {
  const enrollmentNo = profile?.enrollmentNumber;
  return (
    <>
      {/* Use wide/stacked layout for enrollment number since it can be a long number */}
      <StatItem
        label="Enrollment No."
        value={enrollmentNo || 'N/A'}
        icon={CheckCircle2}
        color="green"
        wide={!!(enrollmentNo && String(enrollmentNo).length > 6)}
      />
      <StatItem label="Active Semester" value={profile?.semester != null ? `Sem ${profile.semester}` : 'N/A'} icon={Calendar} color="blue" />
      <StatItem label="Branch"          value={profile?.branch || 'N/A'}                                     icon={Award}       color="yellow" />
    </>
  );
}

// -- Main profile component --
export default function ProfileView() {
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [isEditing, setIsEditing]         = useState(false);
  const [isUploading, setIsUploading]     = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProfile();
      setProfile(data);
      setEditedProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      try {
        const raw = localStorage.getItem('user_data');
        if (raw) {
          const local = JSON.parse(raw);
          setProfile(local);
          setEditedProfile(local);
        } else {
          setError('Failed to load profile. Please refresh.');
        }
      } catch {
        setError('Failed to load profile. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({ ...prev, [name]: value }));
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const result = await updateProfile(editedProfile);
      const updated = result.user || result;
      setProfile(updated);
      setEditedProfile(updated);
      setIsEditing(false);
      const existing = JSON.parse(localStorage.getItem('user_data') || '{}');
      localStorage.setItem('user_data', JSON.stringify({ ...existing, ...updated }));
      showSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const uploadResult = await uploadMedia(file);
      const patchedProfile = { ...profile, profileImage: uploadResult.url };
      const result = await updateProfile(patchedProfile);
      const updated = result.user || result;
      setProfile(updated);
      setEditedProfile(updated);
      const existing = JSON.parse(localStorage.getItem('user_data') || '{}');
      localStorage.setItem('user_data', JSON.stringify({ ...existing, profileImage: uploadResult.url }));
      showSuccess('Profile image updated!');
    } catch (err) {
      console.error('Failed to upload image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium text-sm sm:text-base">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-6 sm:p-10 text-center bg-red-50 rounded-2xl border border-red-200 max-w-sm sm:max-w-lg mx-auto mt-6 sm:mt-10">
        <AlertCircle className="w-10 h-10 sm:w-14 sm:h-14 text-red-400 mx-auto mb-3 sm:mb-4" />
        <h2 className="text-lg sm:text-xl font-bold text-red-900 mb-2">Unable to load profile</h2>
        <p className="text-red-600 text-sm sm:text-base mb-4 sm:mb-6">{error}</p>
        <button
          onClick={loadProfile}
          className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isTeacher = profile?.role === 'teacher';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 px-0">

      {/* Toast */}
      {successMessage && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-50 bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-xl flex items-center gap-2 sm:gap-3 max-w-[90vw] sm:max-w-xs">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="font-semibold text-sm sm:text-base">{successMessage}</span>
        </div>
      )}

      {/* === Banner / Header Card === */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Gradient banner */}
        <div className="h-24 xs:h-28 sm:h-36 md:h-48 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 relative">
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
        </div>

        <div className="px-4 sm:px-6 md:px-10 pb-5 sm:pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 -mt-12 sm:-mt-16 md:-mt-20">

            {/* Avatar */}
            <div className="relative inline-block self-start sm:self-auto">
              <div className="w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl sm:rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-blue-100">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-blue-400" />
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Change profile photo"
                className="absolute -bottom-1 -right-1 p-1.5 sm:p-2 bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Name + edit button */}
            <div className="flex-1 min-w-0 flex flex-col xs:flex-row xs:items-center justify-between gap-3 pt-1 sm:pt-2 pb-1">
              <div className="min-w-0">
                <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 capitalize truncate">
                  {profile?.username || 'User'}
                </h1>
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-gray-400 flex flex-wrap items-center gap-1">
                  {isTeacher
                    ? <><Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Faculty</>
                    : <><GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Student</>
                  }
                  {isTeacher && profile?.department  && <><span className="text-gray-300">·</span>{profile.department}</>}
                  {!isTeacher && profile?.branch     && <><span className="text-gray-300">·</span>{profile.branch}</>}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => { setIsEditing(false); setEditedProfile(profile); }}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Save</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Soft error banner (profile loaded but action failed) */}
      {error && profile && (
        <div className="flex items-start sm:items-center gap-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm font-medium">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* === Two-column body === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">

        {/* Left: Bio + Info Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* Bio */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
              About Me
            </h2>
            {isEditing ? (
              <textarea
                name="bio"
                value={editedProfile?.bio || ''}
                onChange={handleInputChange}
                placeholder="Write a short bio about yourself…"
                rows={4}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800"
              />
            ) : (
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                {profile?.bio || <span className="italic text-gray-400">No biography added yet.</span>}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              Information Details
            </h2>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-y-6 sm:gap-x-10 md:gap-x-12">
              <ProfileField icon={Mail} label="Email Address" value={profile?.email} readOnly />
              <ProfileField
                icon={Phone} label="Phone Number" name="phone"
                value={isEditing ? editedProfile?.phone : profile?.phone}
                isEditing={isEditing} onChange={handleInputChange} placeholder="+91 9XXXXXXXXX"
              />

              {isTeacher ? (
                <>
                  <ProfileField icon={Building2} label="Department" name="department"
                    value={isEditing ? editedProfile?.department : profile?.department}
                    isEditing={isEditing} onChange={handleInputChange} placeholder="e.g. Computer Science" />
                  <ProfileField icon={Briefcase} label="Designation" name="designation"
                    value={isEditing ? editedProfile?.designation : profile?.designation}
                    isEditing={isEditing} onChange={handleInputChange} placeholder="e.g. Assistant Professor" />
                  <ProfileField icon={GraduationCap} label="Qualification" name="qualification"
                    value={isEditing ? editedProfile?.qualification : profile?.qualification}
                    isEditing={isEditing} onChange={handleInputChange} placeholder="e.g. PhD in CS" />
                </>
              ) : (
                <>
                  <ProfileField icon={Award} label="Enrollment No." value={profile?.enrollmentNumber} readOnly />
                  <ProfileField icon={Building2} label="Branch" name="branch"
                    value={isEditing ? editedProfile?.branch : profile?.branch}
                    isEditing={isEditing} onChange={handleInputChange} placeholder="e.g. Computer Engineering" />
                  <ProfileField icon={Calendar} label="Semester" name="semester" type="number"
                    value={isEditing ? editedProfile?.semester : profile?.semester}
                    isEditing={isEditing} onChange={handleInputChange} placeholder="e.g. 4" />
                  <ProfileField icon={MapPin} label="Address" name="address"
                    value={isEditing ? editedProfile?.address : profile?.address}
                    isEditing={isEditing} onChange={handleInputChange} placeholder="City, State" />
                  <ProfileField icon={Calendar} label="Date of Birth" name="dateOfBirth" type="date"
                    value={isEditing ? (editedProfile?.dateOfBirth?.split('T')[0] || '') : (profile?.dateOfBirth?.split('T')[0] || '')}
                    isEditing={isEditing} onChange={handleInputChange} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
              Activity Overview
            </h2>

            <div className="space-y-2 sm:space-y-3">
              {isTeacher ? <FacultyStats /> : <StudentStats profile={profile} />}
            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-center">
              <p className="text-[10px] sm:text-xs text-gray-400 italic">
                Member since{' '}
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
