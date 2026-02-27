import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LanguageContext = createContext({
    language: "en",
    toggleLanguage: () => { },
});

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => {
        try {
            return localStorage.getItem("cl_lang") || "en";
        } catch {
            return "en";
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("cl_lang", language);
        } catch {
            // localStorage unavailable
        }
    }, [language]);

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => (prev === "en" ? "hi" : "en"));
    }, []);

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
