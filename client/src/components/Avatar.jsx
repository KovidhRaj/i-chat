import { getAvatar } from '../lib/avatars'

const Avatar = ({ user, size = 'default', className = '' }) => {
    const preset = getAvatar(user?.avatarUrl)
    const sizeClass = size === 'small' ? 'small' : ''

    if (preset) {
        return (
            <div
                className={`avatar ${sizeClass} ${className}`}
                style={{ background: preset.gradient }}
            >
                {preset.icon}
            </div>
        )
    }

    return (
        <div className={`avatar ${sizeClass} ${className}`}>
            {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
    )
}

export default Avatar
