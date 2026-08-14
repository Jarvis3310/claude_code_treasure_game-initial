import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuest: () => void;
}

interface LoginValues {
  email: string;
  password: string;
}

interface SignupValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function AuthModal({ open, onOpenChange, onGuest }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({ defaultValues: { email: '', password: '' } });
  const signupForm = useForm<SignupValues>({
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  // Clear any leftover input/errors from a previous session whenever the modal is (re)opened
  useEffect(() => {
    if (!open) return;
    loginForm.reset();
    signupForm.reset();
    setLoginError(null);
    setSignupError(null);
    setSignupNotice(null);
  }, [open]);

  const submitLogin = async (values: LoginValues) => {
    setLoginError(null);
    try {
      await signIn(values.email, values.password);
      onOpenChange(false);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed.');
    }
  };

  const submitSignup = async (values: SignupValues) => {
    setSignupError(null);
    setSignupNotice(null);
    try {
      const { needsEmailConfirmation } = await signUp(values.email, values.password, values.username);
      if (needsEmailConfirmation) {
        setSignupNotice('Account created! Check your email to confirm before logging in.');
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Sign up failed.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🏴‍☠️ Treasure Hunt Game</DialogTitle>
          <DialogDescription>Log in to save your high score, or play as a guest.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(submitLogin)}
                autoComplete="off"
                className="grid gap-4 pt-1"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  rules={{ required: 'Email is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          name="login-identifier"
                          autoComplete="off"
                          data-lpignore="true"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  rules={{ required: 'Password is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          name="login-secret"
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {loginError && <p className="text-destructive text-sm">{loginError}</p>}
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                  Log In
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup">
            <Form {...signupForm}>
              <form
                onSubmit={signupForm.handleSubmit(submitSignup)}
                autoComplete="off"
                className="grid gap-4 pt-1"
              >
                <FormField
                  control={signupForm.control}
                  name="username"
                  rules={{ required: 'Player name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          name="signup-player-name"
                          autoComplete="off"
                          data-lpignore="true"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="email"
                  rules={{ required: 'Email is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          name="signup-identifier"
                          autoComplete="off"
                          data-lpignore="true"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  rules={{
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          name="signup-secret"
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  rules={{
                    required: 'Please confirm your password',
                    validate: (value) => value === signupForm.getValues('password') || 'Passwords do not match',
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          name="signup-secret-confirm"
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {signupError && <p className="text-destructive text-sm">{signupError}</p>}
                {signupNotice && <p className="text-sm text-green-600">{signupNotice}</p>}
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                  Sign Up
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" className="w-full" onClick={onGuest}>
            Continue as Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
