import sys

def replace_vars(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove the old :root{...}
    import re
    content = re.sub(r':root\{[^}]+\}', '', content, count=1)

    # Replacements
    content = content.replace('var(--ink)', 'var(--foreground)')
    content = content.replace('var(--green)', 'var(--primary)')
    content = content.replace('var(--cream)', 'var(--background)')
    content = content.replace('var(--paper)', 'var(--card)')
    content = content.replace('var(--line)', 'var(--border)')
    content = content.replace('var(--muted)', 'var(--muted-foreground)')
    content = content.replace('var(--orange)', 'var(--chart-1)')

    css_vars = """
:root {
  --card: #f8f5f0;
  --ring: #2e7d32;
  --input: #e0d6c9;
  --muted: #f0e9e0;
  --accent: #c8e6c9;
  --border: #e0d6c9;
  --radius: 0.5rem;
  --chart-1: #4caf50;
  --chart-2: #388e3c;
  --chart-3: #2e7d32;
  --chart-4: #1b5e20;
  --chart-5: #0a1f0c;
  --popover: #f8f5f0;
  --primary: #2e7d32;
  --sidebar: #f0e9e0;
  --font-mono: Source Code Pro, monospace;
  --font-sans: Montserrat, sans-serif;
  --secondary: #e8f5e9;
  --background: #f8f5f0;
  --font-serif: Merriweather, serif;
  --foreground: #3e2723;
  --destructive: #c62828;
  --sidebar-ring: #2e7d32;
  --sidebar-accent: #c8e6c9;
  --sidebar-border: #e0d6c9;
  --card-foreground: #3e2723;
  --sidebar-primary: #2e7d32;
  --muted-foreground: #6d4c41;
  --accent-foreground: #1b5e20;
  --popover-foreground: #3e2723;
  --primary-foreground: #ffffff;
  --sidebar-foreground: #3e2723;
  --secondary-foreground: #1b5e20;
  --destructive-foreground: #ffffff;
  --sidebar-accent-foreground: #1b5e20;
  --sidebar-primary-foreground: #ffffff;
}

.dark {
  --card: #2d3a2e;
  --ring: #4caf50;
  --input: #3e4a3d;
  --muted: #252f26;
  --accent: #388e3c;
  --border: #3e4a3d;
  --radius: 0.5rem;
  --chart-1: #81c784;
  --chart-2: #66bb6a;
  --chart-3: #4caf50;
  --chart-4: #43a047;
  --chart-5: #388e3c;
  --popover: #2d3a2e;
  --primary: #4caf50;
  --sidebar: #1c2a1f;
  --secondary: #3e4a3d;
  --background: #1c2a1f;
  --foreground: #f0ebe5;
  --destructive: #c62828;
  --sidebar-ring: #4caf50;
  --sidebar-accent: #388e3c;
  --sidebar-border: #3e4a3d;
  --card-foreground: #f0ebe5;
  --sidebar-primary: #4caf50;
  --muted-foreground: #d7cfc4;
  --accent-foreground: #f0ebe5;
  --popover-foreground: #f0ebe5;
  --primary-foreground: #0a1f0c;
  --sidebar-foreground: #f0ebe5;
  --secondary-foreground: #d7e0d6;
  --destructive-foreground: #f0ebe5;
  --sidebar-accent-foreground: #f0ebe5;
  --sidebar-primary-foreground: #0a1f0c;
}
"""
    with open(filepath, 'w') as f:
        f.write(css_vars + content)

replace_vars('styles.css')
replace_vars('admin.css')
