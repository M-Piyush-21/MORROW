import { Toaster as Sonner } from 'sonner';
import { useApp } from '@/context/AppContext';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  let theme: 'light' | 'dark' | 'system' = 'light';
  try {
    const app = useApp();
    if (app?.theme) theme = app.theme;
  } catch {
    // outside AppContext fallback
  }

  return (
    <Sonner
      theme={theme}
      richColors
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
