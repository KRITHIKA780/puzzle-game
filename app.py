from flask import Flask, render_template, request, jsonify
from collections import deque
import heapq

app = Flask(__name__)

GOAL_STATE = ((1, 2, 3),
              (4, 5, 6),
              (7, 8, 0))

MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def find_zero(state):
    for i in range(3):
        for j in range(3):
            if state[i][j] == 0:
                return i, j

def swap(state, x1, y1, x2, y2):
    state = [list(row) for row in state]
    state[x1][y1], state[x2][y2] = state[x2][y2], state[x1][y1]
    return tuple(tuple(row) for row in state)

def get_neighbors(state):
    neighbors = []
    x, y = find_zero(state)
    for dx, dy in MOVES:
        nx, ny = x + dx, y + dy
        if 0 <= nx < 3 and 0 <= ny < 3:
            neighbors.append(swap(state, x, y, nx, ny))
    return neighbors

def bfs_8puzzle(start):
    queue = deque([(start, [])])
    visited = set([start])

    while queue:
        state, path = queue.popleft()
        if state == GOAL_STATE:
            return path + [state]

        for neighbor in get_neighbors(state):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [state]))
    return None

def dfs_8puzzle(start):
    stack = [(start, [])]
    visited = set()

    # DFS can be very deep, we might want to limit depth or just hope for the best on small puzzles
    # For 8-puzzle, simple DFS is dangerous without depth limit, but using user's simple stack logic:
    while stack:
        state, path = stack.pop()
        if state == GOAL_STATE:
            return path + [state]

        if state not in visited:
            visited.add(state)
            # Reversing neighbors to match typical recursion definition if needed, 
            # but order doesn't strictly matter for correctness, just path found.
            for neighbor in get_neighbors(state): 
                stack.append((neighbor, path + [state]))
    return None

def heuristic(state):
    dist = 0
    for i in range(3):
        for j in range(3):
            val = state[i][j]
            if val != 0:
                proper_x, proper_y = divmod(val - 1, 3)
                dist += abs(i - proper_x) + abs(j - proper_y)
    return dist

def astar_8puzzle(start):
    pq = []
    # (f, g, state, path)
    heapq.heappush(pq, (heuristic(start), 0, start, []))
    visited = set()

    while pq:
        f, g, state, path = heapq.heappop(pq)

        if state == GOAL_STATE:
            return path + [state]

        if state not in visited:
            visited.add(state)
            for neighbor in get_neighbors(state):
                if neighbor not in visited:
                    new_g = g + 1
                    new_f = new_g + heuristic(neighbor)
                    heapq.heappush(pq, (new_f, new_g, neighbor, path + [state]))
    return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json
    start_flat = data.get('start_state') # Expecting list of 9 integers
    algorithm = data.get('algorithm')
    
    if not start_flat or len(start_flat) != 9:
        return jsonify({'error': 'Invalid input'}), 400

    start_state = tuple(tuple(start_flat[i:i+3]) for i in range(0, 9, 3))
    
    solution_path = None
    if algorithm == 'bfs':
        solution_path = bfs_8puzzle(start_state)
    elif algorithm == 'dfs':
        solution_path = dfs_8puzzle(start_state)
    elif algorithm == 'astar':
        solution_path = astar_8puzzle(start_state)
    
    if solution_path:
        # Convert path of tuples back to simple lists for JSON
        formatted_path = []
        for step in solution_path:
            formatted_path.append([cell for row in step for cell in row])
        return jsonify({'success': True, 'path': formatted_path})
    else:
        return jsonify({'success': False, 'message': 'No solution found (unsolvable?)'})

if __name__ == '__main__':
    app.run(debug=True)
