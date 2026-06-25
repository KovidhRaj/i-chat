const PRESET_AVATARS = [
    { id: 'avatar-1', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', icon: '😎' },
    { id: 'avatar-2', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)', icon: '🌸' },
    { id: 'avatar-3', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)', icon: '🐬' },
    { id: 'avatar-4', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)', icon: '🌿' },
    { id: 'avatar-5', gradient: 'linear-gradient(135deg, #fa709a, #fee140)', icon: '🔥' },
    { id: 'avatar-6', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', icon: '🦄' },
    { id: 'avatar-7', gradient: 'linear-gradient(135deg, #fccb90, #d57eeb)', icon: '🎨' },
    { id: 'avatar-8', gradient: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)', icon: '☁️' },
    { id: 'avatar-9', gradient: 'linear-gradient(135deg, #ff9a9e, #fecfef)', icon: '🌺' },
    { id: 'avatar-10', gradient: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)', icon: '❄️' },
    { id: 'avatar-11', gradient: 'linear-gradient(135deg, #fdcbf1, #e6dee9)', icon: '🐱' },
    { id: 'avatar-12', gradient: 'linear-gradient(135deg, #84fab0, #8fd3f4)', icon: '🐸' },
    { id: 'avatar-13', gradient: 'linear-gradient(135deg, #f6d365, #fda085)', icon: '🌞' },
    { id: 'avatar-14', gradient: 'linear-gradient(135deg, #96fbc4, #f9f586)', icon: '🍀' },
    { id: 'avatar-15', gradient: 'linear-gradient(135deg, #cd9cf2, #f6f3ff)', icon: '👾' },
    { id: 'avatar-16', gradient: 'linear-gradient(135deg, #667eea, #f093fb)', icon: '🚀' },
]

export const getAvatar = (avatarUrl) => {
    return PRESET_AVATARS.find(a => a.id === avatarUrl) || null
}

export default PRESET_AVATARS
