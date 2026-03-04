import {Calendar as CalendarIcon, List, LogOut, Menu, Moon, Package, ShoppingCart, Sun, Users, Utensils, X, Shield} from 'lucide-react';
import {useState} from 'react';
import {useAppContext} from '../hooks/useAppContext';
import {apiJson} from '../utils/apiRequest';
import appVersion from '../../version?raw';

const APP_VERSION = appVersion.trim();

const DarkModeToggle = ({darkMode, setDarkMode}: {darkMode: boolean; setDarkMode: (v: boolean) => void}) => (
    <button
        onClick={() => setDarkMode(!darkMode)}
        className="icon-button"
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
        {darkMode ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
    </button>
);

const UnitSystemToggle = ({unitSystem, setUnitSystem}: {unitSystem: 'metric' | 'imperial' | 'both'; setUnitSystem: (s: 'metric' | 'imperial' | 'both') => void}) => (
    <div className="pill-toggle">
        {(['imperial', 'metric', 'both'] as const).map(sys => (
            <button
                key={sys}
                onClick={() => setUnitSystem(sys)}
                className={`pill-toggle-button ${unitSystem === sys ? 'pill-toggle-active' : 'pill-toggle-inactive'}`}
            >
                {sys === 'both' ? 'Both' : sys.slice(0, 3)}
            </button>
        ))}
    </div>
);

interface NavigationProps {
    view: string;
    setView: (view: 'recipes' | 'ingredients' | 'calendar' | 'shopping' | 'weekly' | 'participants' | 'admin') => void;
    setDarkMode: (dark: boolean) => void;
    setUnitSystem: (sys: 'metric' | 'imperial' | 'both') => void;
    onLogout: () => void;
}

export function Navigation({
                               view,
                               setView,
                               setDarkMode,
                               setUnitSystem,
                               onLogout
                           }: NavigationProps) {
    const { darkMode, unitSystem, userTier } = useAppContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await apiJson('/api/logout', 'POST');
        onLogout();
    };

    const navItems = [
        {id: 'recipes', label: 'Recipes', icon: List},
        {id: 'ingredients', label: 'Ingredients', icon: Package},
        {id: 'calendar', label: 'Plan Overview', icon: CalendarIcon},
        {id: 'weekly', label: 'Weekly Planner', icon: CalendarIcon},
        {id: 'shopping', label: 'Shopping List', icon: ShoppingCart},
        {id: 'participants', label: 'Participants', icon: Users},
        ...(userTier === 'Admin' ? [{id: 'admin', label: 'Admin', icon: Shield}] : []),
    ] as const;

    return (
        <nav className="nav-surface">
            <div className="nav-container">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Utensils className="h-8 w-8 text-indigo-600"/>
                        <span className="ml-2 text-xl font-bold tracking-tight">
                            PromptPantry
                            <sub className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">{APP_VERSION}</sub>
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setView(item.id as any)}
                                className={`nav-button ${view === item.id ? 'nav-button-active' : 'nav-button-inactive'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center ml-4 border-l dark:border-gray-800 pl-4 space-x-4">
                        <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode}/>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Units:</span>
                            <UnitSystemToggle unitSystem={unitSystem} setUnitSystem={setUnitSystem}/>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="icon-button"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5"/>
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="icon-button"
                        >
                            {isMenuOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="md:hidden border-t dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 space-y-4">
                    <div className="flex flex-col space-y-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setView(item.id as any);
                                    setIsMenuOpen(false);
                                }}
                                className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                                    view === item.id
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <item.icon className="h-5 w-5 mr-3"/>
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="pt-4 border-t dark:border-gray-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Dark Mode</span>
                            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode}/>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Units</span>
                            <UnitSystemToggle unitSystem={unitSystem} setUnitSystem={setUnitSystem}/>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                        >
                            <LogOut className="h-5 w-5 mr-3"/>
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
