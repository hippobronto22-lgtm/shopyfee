
def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    brace_stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char == '{':
                brace_stack.append(('{', i + 1, j + 1))
            elif char == '}':
                if brace_stack:
                    b, l, c = brace_stack.pop()
                    if "activeTab ===" in lines[l-1]:
                        print(f"Matched block '{lines[l-1].strip()}' at {l}:{c} with '}}' at {i+1}:{j+1}")
                else:
                    pass
    
check_balance('src/App.jsx')
