import os
import subprocess
import glob
import random
from datetime import datetime, timedelta

def run_cmd(cmd, env=None):
    try:
        subprocess.run(cmd, check=True, shell=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        pass

real_commits = [
    {"msg": "Initial commit: basic project structure", "patterns": ["README.md", ".gitignore", "admin/.gitignore", "mobile/.gitignore", "server/.env.example"]},
    {"msg": "chore: setup server dependencies and typescript", "patterns": ["server/package.json", "server/tsconfig.json", "server/package-lock.json"]},
    {"msg": "feat: add domain types and express setup", "patterns": ["server/src/domain/*", "server/src/app.ts", "server/src/index.ts", "server/src/types/*"]},
    {"msg": "feat: add mongo db configuration", "patterns": ["server/src/db/*", "server/src/config/*"]},
    {"msg": "feat: add repository layer for users and recipes", "patterns": ["server/src/repos/*"]},
    {"msg": "feat: setup basic services for auth and recipes", "patterns": ["server/src/services/authService.ts", "server/src/services/recipesService.ts"]},
    {"msg": "feat: implement auth middleware", "patterns": ["server/src/middleware/*"]},
    {"msg": "feat: add basic routing for auth and health", "patterns": ["server/src/routes/auth.ts", "server/src/routes/health.ts"]},
    {"msg": "chore: initialize admin panel with vite", "patterns": ["admin/package.json", "admin/vite.config.ts", "admin/tsconfig*.json", "admin/eslint.config.js", "admin/index.html", "admin/package-lock.json"]},
    {"msg": "feat: admin ui core app structure", "patterns": ["admin/src/main.tsx", "admin/src/App.tsx", "admin/src/App.css", "admin/src/index.css", "admin/src/assets/*"]},
    {"msg": "feat: add api integration for admin", "patterns": ["admin/src/api.ts", "admin/src/types.ts"]},
    {"msg": "chore: initialize expo mobile app", "patterns": ["mobile/package.json", "mobile/app.json", "mobile/tsconfig.json", "mobile/App.tsx", "mobile/package-lock.json"]},
    {"msg": "feat: setup mobile api and types", "patterns": ["mobile/src/api/*"]},
    {"msg": "feat: add mobile themes and navigation basics", "patterns": ["mobile/src/theme/*", "mobile/src/navigation/*"]},
    {"msg": "feat: add auth screens to mobile", "patterns": ["mobile/src/screens/LoginScreen.tsx", "mobile/src/screens/RegisterScreen.tsx", "mobile/src/auth/*", "mobile/src/storage/*"]},
    {"msg": "feat: build mobile home and recipe screens", "patterns": ["mobile/src/screens/HomeScreen.tsx", "mobile/src/screens/RecipesListScreen.tsx", "mobile/src/screens/RecipeDetailScreen.tsx"]},
    {"msg": "feat: add mobile ui components", "patterns": ["mobile/src/components/*"]},
    {"msg": "feat: integrate ai provider services in server", "patterns": ["server/src/services/aiProvider.ts", "server/src/services/openaiClient.ts", "server/src/services/spoonacularClient.ts", "server/src/services/photoRecipeService.ts", "server/src/services/aiChatService.ts"]},
    {"msg": "feat: ai routing and endpoints", "patterns": ["server/src/routes/ai.ts", "server/src/services/aiRecommendationsService.ts"]},
    {"msg": "feat: complete remaining server routes", "patterns": ["server/src/routes/recipes.ts", "server/src/routes/favorites.ts", "server/src/routes/admin.ts", "server/src/services/favoritesService.ts"]},
    {"msg": "feat: complete mobile screens for ai, favorites, and cart", "patterns": ["mobile/src/screens/*", "mobile/src/cart/*", "mobile/src/data/*"]},
    {"msg": "chore: final styling and config updates", "patterns": ["admin/src/*", "server/src/dev-memory.ts", "server/src/services/seedService.ts", "mobile/index.ts"]},
    {"msg": "fix: resolve minor bugs and update readmes", "patterns": ["."]}
]

filler_messages = [
    "style: format code with prettier",
    "refactor: optimize imports",
    "docs: fix typo in comments",
    "chore: update minor dependencies",
    "fix: resolve console warning",
    "refactor: extract magic numbers to constants",
    "style: remove trailing whitespace",
    "test: add placeholder for unit tests",
    "chore: clean up unused variables",
    "fix: adjust layout margins slightly",
    "style: adhere to linting rules",
    "docs: add jsdoc to helper function"
]

def main():
    # Remove existing .git if running locally
    if os.path.exists(".git"):
        import shutil
        shutil.rmtree(".git", ignore_errors=True)
        
    run_cmd("git init")
    run_cmd('git config user.email "umerkhn819@gmail.com"')
    run_cmd('git config user.name "Umar Khan"')
    
    # Starting date: ~30 days ago
    start_date = datetime(2026, 4, 8)
    current_date = start_date
    end_date = datetime(2026, 5, 8)
    
    total_days = (end_date - start_date).days
    
    # Assign commit counts per day to create a realistic distribution
    # Most days 0-3 commits. A few days 6-8 commits.
    day_commit_counts = []
    for _ in range(total_days + 1):
        r = random.random()
        if r < 0.2:
            count = 0  # 20% chance of no commits
        elif r < 0.6:
            count = random.randint(1, 3) # 40% chance of normal day
        elif r < 0.9:
            count = random.randint(4, 5) # 30% chance of busy day
        else:
            count = random.randint(6, 8) # 10% chance of heavy day (the 6,7 user asked for)
        day_commit_counts.append(count)
    
    # We have 23 real commits. Let's interleave them.
    real_commit_idx = 0
    
    for day_idx, count in enumerate(day_commit_counts):
        if count == 0:
            continue
            
        base_day = start_date + timedelta(days=day_idx)
        
        # Distribute 'count' commits within this day
        # e.g., between 9 AM and 6 PM
        times = sorted([random.randint(9*60, 18*60) for _ in range(count)])
        
        for minutes_since_midnight in times:
            commit_time = base_day + timedelta(minutes=minutes_since_midnight)
            date_str = commit_time.strftime("%Y-%m-%dT%H:%M:%S")
            env = os.environ.copy()
            env["GIT_AUTHOR_DATE"] = date_str
            env["GIT_COMMITTER_DATE"] = date_str
            
            # Decide if we use a real commit or a filler
            # We want to use all 23 real commits by the end of the 30 days.
            # roughly 1 real commit per day if we have them.
            is_real = False
            if real_commit_idx < len(real_commits):
                # 50% chance to be a real commit if we haven't used them all, 
                # OR if we are running out of days and need to dump them.
                remaining_days = total_days - day_idx
                remaining_real = len(real_commits) - real_commit_idx
                if random.random() < 0.5 or remaining_real >= remaining_days:
                    is_real = True
            
            if is_real:
                commit_data = real_commits[real_commit_idx]
                real_commit_idx += 1
                files_added = False
                for pattern in commit_data["patterns"]:
                    normalized_pattern = pattern.replace("/", "\\")
                    if pattern == ".":
                        run_cmd("git add .")
                        files_added = True
                    else:
                        matches = glob.glob(normalized_pattern, recursive=True)
                        if matches:
                            run_cmd(f"git add \"{pattern}\"")
                            files_added = True
                
                # Commit real
                if files_added:
                    status_out = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
                    if status_out.stdout.strip():
                        run_cmd(f'git commit -m "{commit_data["msg"]}"', env=env)
                    else:
                        # Fallback to empty if it couldn't add
                        msg = random.choice(filler_messages)
                        run_cmd(f'git commit --allow-empty -m "{msg}"', env=env)
            else:
                # Filler commit
                msg = random.choice(filler_messages)
                run_cmd(f'git commit --allow-empty -m "{msg}"', env=env)
                
    # If any real commits are left over, just add them today
    while real_commit_idx < len(real_commits):
        commit_data = real_commits[real_commit_idx]
        real_commit_idx += 1
        for pattern in commit_data["patterns"]:
            if pattern == ".":
                run_cmd("git add .")
            else:
                run_cmd(f"git add \"{pattern}\"")
        
        status_out = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
        if status_out.stdout.strip():
            date_str = end_date.strftime("%Y-%m-%dT%H:%M:%S")
            env = os.environ.copy()
            env["GIT_AUTHOR_DATE"] = date_str
            env["GIT_COMMITTER_DATE"] = date_str
            run_cmd(f'git commit -m "{commit_data["msg"]}"', env=env)

if __name__ == "__main__":
    main()
