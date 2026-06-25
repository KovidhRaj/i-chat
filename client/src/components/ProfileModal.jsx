import { useState } from 'react'
import useAuthStore from '../store/authStore'
import PRESET_AVATARS, { getAvatar } from '../lib/avatars'
import api from '../lib/axios'

const ProfileModal = ({ onClose }) => {
    const { user, setAuth } = useAuthStore()
    const token = useAuthStore((s) => s.token)
    const [displayName, setDisplayName] = useState(user?.displayName || '')
    const [bio, setBio] = useState(user?.bio || '')
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await api.put('/users/profile', {
                displayName,
                bio,
                avatarUrl: selectedAvatar
            })
            setAuth({ ...user, ...res.data }, token)
            onClose()
        } catch (err) {
            console.error('Failed to save profile:', err)
        } finally {
            setSaving(false)
        }
    }

    const currentAvatar = getAvatar(selectedAvatar)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Profile</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {/* current avatar preview */}
                    <div className="avatar-preview-row">
                        <div
                            className="avatar-preview"
                            style={{ background: currentAvatar?.gradient || 'var(--accent)' }}
                        >
                            {currentAvatar ? currentAvatar.icon : user?.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <p className="avatar-preview-name">{displayName || user?.username}</p>
                            <p className="avatar-preview-sub">@{user?.username}</p>
                        </div>
                    </div>

                    {/* avatar grid */}
                    <label className="field-label">Choose Avatar</label>
                    <div className="avatar-grid">
                        {PRESET_AVATARS.map(av => (
                            <button
                                key={av.id}
                                className={`avatar-option ${selectedAvatar === av.id ? 'selected' : ''}`}
                                style={{ background: av.gradient }}
                                onClick={() => setSelectedAvatar(av.id)}
                            >
                                {av.icon}
                            </button>
                        ))}
                    </div>

                    {/* display name */}
                    <label className="field-label">Display Name</label>
                    <input
                        className="profile-input"
                        type="text"
                        placeholder="How should others see you?"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={30}
                    />

                    {/* bio */}
                    <label className="field-label">Bio</label>
                    <textarea
                        className="profile-textarea"
                        placeholder="Tell people about yourself..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={150}
                        rows={3}
                    />
                </div>

                <div className="modal-footer">
                    <button className="modal-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="modal-btn primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProfileModal
