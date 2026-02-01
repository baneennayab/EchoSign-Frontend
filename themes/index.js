// EchoSign Theme Configuration
// Professional theme system with gradients, glassmorphism, and accessibility

export const themes = {
    dark: {
        // Core colors
        bg: '#0a0f1a',
        surface: 'rgba(30,41,59,0.85)',
        surfaceSolid: '#1e293b',
        card: 'rgba(31,41,55,0.9)',
        text: '#f8fafc',
        subtext: '#94a3b8',
        muted: '#64748b',

        // Brand colors
        primary: '#22d3ee',
        primaryDark: '#06b6d4',
        secondary: '#a855f7',
        secondaryDark: '#9333ea',
        accent: '#f472b6',

        // Status colors
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',

        // UI elements
        border: 'rgba(255,255,255,0.08)',
        borderLight: 'rgba(255,255,255,0.12)',
        input: '#0f172a',
        inputBorder: '#334155',

        // Gradients
        gradientPrimary: ['#06b6d4', '#3b82f6', '#8b5cf6'],
        gradientSecondary: ['#a855f7', '#ec4899'],
        gradientDark: ['#0a0f1a', '#1e293b'],

        // Glass effect
        glass: 'rgba(30,41,59,0.7)',
        glassStrong: 'rgba(30,41,59,0.85)',
        glassBorder: 'rgba(255,255,255,0.08)',

        // Shadows
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowPrimary: 'rgba(6,182,212,0.25)',

        // Status bar
        statusBarStyle: 'light-content',
        statusBarBg: '#0a0f1a'
    },

    light: {
        // Core colors
        bg: '#f0f9ff',
        surface: '#ffffff',
        surfaceSolid: '#ffffff',
        card: '#ffffff',
        text: '#0f172a',
        subtext: '#64748b',
        muted: '#94a3b8',

        // Brand colors
        primary: '#0891b2',
        primaryDark: '#0e7490',
        secondary: '#9333ea',
        secondaryDark: '#7c3aed',
        accent: '#ec4899',

        // Status colors
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626',

        // UI elements
        border: 'rgba(0,0,0,0.06)',
        borderLight: 'rgba(0,0,0,0.1)',
        input: '#f8fafc',
        inputBorder: '#e2e8f0',

        // Gradients
        gradientPrimary: ['#06b6d4', '#3b82f6', '#8b5cf6'],
        gradientSecondary: ['#9333ea', '#ec4899'],
        gradientDark: ['#e0f2fe', '#f0f9ff'],

        // Glass effect
        glass: 'rgba(255,255,255,0.8)',
        glassStrong: 'rgba(255,255,255,0.95)',
        glassBorder: 'rgba(0,0,0,0.06)',

        // Shadows
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowPrimary: 'rgba(6,182,212,0.2)',

        // Status bar
        statusBarStyle: 'dark-content',
        statusBarBg: '#f0f9ff'
    }
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999
};

export const typography = {
    hero: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    h1: { fontSize: 28, fontWeight: '800' },
    h2: { fontSize: 24, fontWeight: '700' },
    h3: { fontSize: 20, fontWeight: '700' },
    h4: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    bodyBold: { fontSize: 16, fontWeight: '600' },
    caption: { fontSize: 14, fontWeight: '500' },
    small: { fontSize: 12, fontWeight: '500' },
    tiny: { fontSize: 10, fontWeight: '600', letterSpacing: 1 }
};

export default themes;
