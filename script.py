import re

host_path = 'src/app/[locale]/host/[code]/page.tsx'
play_path = 'src/app/[locale]/play/[code]/page.tsx'

with open(host_path, 'r', encoding='utf-8') as f:
    host_code = f.read()

# Replace Leaderboard logic in Host
host_code = re.sub(
    r'const \[leaderboard, setLeaderboard\] = useState<Record<string, number>>\(\{\}\);',
    'const [leaderboard, setLeaderboard] = useState<Record<string, { points: number, correct: number, incorrect: number }>>({});',
    host_code
)

# Replace handlePeerMessage points calculation
host_code = re.sub(
    r'setLeaderboard\(prev => \(\{\s*\.\.\.prev,\s*\[peerId\]: \(prev\[peerId\] \|\| 0\) \+ earned\s*\}\)\);',
    '''setLeaderboard(prev => {
          const current = prev[peerId] || { points: 0, correct: 0, incorrect: 0 };
          return {
            ...prev,
            [peerId]: {
              points: current.points + earned,
              correct: current.correct + 1,
              incorrect: current.incorrect
            }
          };
        });''',
    host_code
)

# And add incorrect logic
host_code = re.sub(
    r'if \(isCorrect\) \{([\s\S]*?)\} else \{',
    r'if (isCorrect) {\1} else {\n        setLeaderboard(prev => {\n          const current = prev[peerId] || { points: 0, correct: 0, incorrect: 0 };\n          return { ...prev, [peerId]: { ...current, incorrect: current.incorrect + 1 } };\n        });',
    host_code
)

if '} else {' not in host_code: # means it didn't have an else block
    host_code = re.sub(
        r'if \(isCorrect\) \{([\s\S]*?)\}(\s*)\}',
        r'''if (isCorrect) {\1} else {
        setLeaderboard(prev => {
          const current = prev[peerId] || { points: 0, correct: 0, incorrect: 0 };
          return { ...prev, [peerId]: { ...current, incorrect: current.incorrect + 1 } };
        });
      }\2}''',
        host_code
    )

with open(host_path, 'w', encoding='utf-8') as f:
    f.write(host_code)

print("Modified host")
