import React, { useRef, useState } from 'react';
import Icons from './Icons';

export default function Avatar({ 
    avatarData, 
    name, 
    size = 40, 
    onUpload, 
    editable = false,
    style = {},
    className = ""
}) {
    const fileInputRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Determines if avatarData is an image (base64 or URL)
    const isImage = avatarData && (avatarData.startsWith('data:image') || avatarData.startsWith('http'));

    // Fallback initials if avatarData is missing or just initials
    const initials = isImage ? '' : (avatarData || (name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'));

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Compress image using Canvas
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 150;
                const MAX_HEIGHT = 150;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG to save space
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                if (onUpload) {
                    onUpload(dataUrl);
                }
                setIsUploading(false);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const containerStyle = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: isImage ? 'transparent' : 'var(--blue-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.4}px`,
        fontWeight: 700,
        color: 'white',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        cursor: editable ? 'pointer' : 'default',
        boxShadow: isImage ? 'none' : '0 2px 8px rgba(59,130,246,0.2)',
        ...style
    };

    const imageSrc = isImage 
        ? (avatarData.startsWith('http') ? `${avatarData}${avatarData.includes('?') ? '&' : '?'}t=${new Date().getTime()}` : avatarData) 
        : '';

    return (
        <div 
            className={`avatar-container ${className}`} 
            style={containerStyle}
            onMouseEnter={() => editable && setIsHovered(true)}
            onMouseLeave={() => editable && setIsHovered(false)}
            onClick={() => editable && fileInputRef.current?.click()}
        >
            {isImage ? (
                <img 
                    src={imageSrc} 
                    alt={name || "Avatar"} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
            ) : (
                <span>{initials}</span>
            )}

            {/* Hover Overlay for Upload */}
            {editable && (isHovered || isUploading) && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.2s',
                    color: '#fff'
                }}>
                    {isUploading ? (
                        <Icons.Spinner style={{ width: size * 0.4, height: size * 0.4 }} />
                    ) : (
                        <Icons.Camera style={{ width: size * 0.4, height: size * 0.4 }} />
                    )}
                </div>
            )}

            {editable && (
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleFileChange}
                />
            )}
        </div>
    );
}
