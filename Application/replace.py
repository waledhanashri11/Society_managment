import os
import re

def process_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)
        
    if content != original_content:
        # Check if SocietyBlue40 needs to be imported
        if 'SocietyBlue40' in content and 'import com.example.application.ui.theme.SocietyBlue40' not in content:
            # Find the last import and insert it there
            content = re.sub(r'(import .*?\n)(?!\s*import)', r'\1import com.example.application.ui.theme.SocietyBlue40\n', content, count=1)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

base_dir = r"d:\Society\Society_managment\Application\app\src\main\java\com\example\application\ui\screens"

# Replacements for CommunicationScreens.kt
process_file(os.path.join(base_dir, "communication", "CommunicationScreens.kt"), [
    (r'Color\(0xFF0B56D9\)', 'SocietyBlue40'),
    (r'RoundedCornerShape\(12\.dp\)', 'RoundedCornerShape(16.dp)'),
    (r'RoundedCornerShape\(10\.dp\)', 'RoundedCornerShape(16.dp)'),
    (r'RoundedCornerShape\(14\.dp\)', 'RoundedCornerShape(16.dp)'),
    (r'RoundedCornerShape\(18\.dp\)', 'RoundedCornerShape(16.dp)'),
    (r'RoundedCornerShape\(28\.dp\)', 'RoundedCornerShape(24.dp)'),
    (r'RoundedCornerShape\(topStart = 24\.dp, topEnd = 24\.dp\)', 'RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)'), # keep
    (r'RoundedCornerShape\(50\)', 'RoundedCornerShape(50)'), # keep
])

# Replacements for MaintenanceScreens.kt
process_file(os.path.join(base_dir, "maintenance", "MaintenanceScreens.kt"), [
    (r'Color\(0xFF0B56D9\)', 'SocietyBlue40'),
    (r'RoundedCornerShape\(10\.dp\)', 'RoundedCornerShape(16.dp)'),
    (r'RoundedCornerShape\(12\.dp\)', 'RoundedCornerShape(16.dp)'),
    (r'RoundedCornerShape\(18\.dp\)', 'RoundedCornerShape(16.dp)')
])

print("Replacements done.")
