import React, {useState} from 'react';

interface LoginProps {
    onLogin: (username: string, tier: 'Viewer' | 'Editor' | 'Admin') => void;
}

export const Login: React.FC<LoginProps> = ({onLogin}) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const fetchRegistrationStatus = React.useCallback(() => {
        fetch('/api/registration-status')
            .then(res => res.json())
            .then(data => setRegistrationEnabled(data.registrationEnabled))
            .catch(err => console.error('Failed to fetch registration status', err));
    }, []);

    React.useEffect(() => {
        fetchRegistrationStatus();
    }, [fetchRegistrationStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        const endpoint = isRegistering ? '/api/register' : '/api/login';
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password}),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            if (isRegistering) {
                setMessage('Registration successful! You can now log in.');
                setIsRegistering(false);
                setPassword('');
                fetchRegistrationStatus();
            } else {
                onLogin(data.username, data.tier);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
                    {isRegistering ? 'Create an Account' : 'Login to PromptPantry'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="username"
                               className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"
                               className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {isRegistering ? 'Register' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    {registrationEnabled && (
                        <button
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError(null);
                                setMessage(null);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                            {isRegistering
                                ? 'Already have an account? Sign in'
                                : "Don't have an account? Register"}
                        </button>
                    )}
                    {!registrationEnabled && !isRegistering && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Account creation is currently disabled.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
