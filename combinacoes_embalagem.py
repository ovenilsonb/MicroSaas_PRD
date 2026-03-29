def find_volume_combinations(N, capacities=[5, 2, 1, 0.5]):
    results = []
    unique_volumes = set()
    
    def backtrack(index, current_n, current_combo):
        if index == len(capacities) - 1:
            qty = current_n
            combo = current_combo.copy()
            combo[capacities[index]] = qty
            vol = sum(cap * count for cap, count in combo.items())
            results.append((vol, combo))
            unique_volumes.add(vol)
            return
            
        cap = capacities[index]
        for qty in range(current_n + -1, -2, -1): # descending from current_n down to 0
            if qty == -1: continue # safety check for my mental model
            current_combo[cap] = qty
            backtrack(index + 1, current_n - qty, current_combo)
            
    def backtrack_fixed(index, current_n, current_combo):
        if index == len(capacities) - 1:
            qty = current_n
            combo = current_combo.copy()
            combo[capacities[index]] = qty
            vol = sum(cap * count for cap, count in combo.items())
            results.append((vol, combo))
            unique_volumes.add(vol)
            return
            
        cap = capacities[index]
        for qty in range(current_n, -1, -1):
            current_combo[cap] = qty
            backtrack_fixed(index + 1, current_n - qty, current_combo)

    backtrack_fixed(0, N, {})
    
    # Sort descending by volume
    results.sort(key=lambda x: x[0], reverse=True)
    return results, sorted(list(unique_volumes))

def run_example(N):
    res, vols = find_volume_combinations(N)
    print(f"\nPara N = {N} frascos:")
    print(f"Combinacoes totais: {len(res)}")
    print(f"Volumes distintos gerados: {len(vols)}")
    print(f"Volume Maximo: {max(vols)} L")
    print(f"Volume Minimo: {min(vols)} L")
    
    print("\nAmostra (Volume -> 5L | 2L | 1L | 0.5L):")
    print("... Maiores Volumes:")
    for v, c in res[:3]:
        print(f"  {v} L  ->  {c.get(5,0)}x5L | {c.get(2,0)}x2L | {c.get(1,0)}x1L | {c.get(0.5,0)}x0.5L")
        
    print("... Intermediarios:")
    mid = len(res) // 2
    for v, c in res[mid:mid+3]:
        print(f"  {v} L  ->  {c.get(5,0)}x5L | {c.get(2,0)}x2L | {c.get(1,0)}x1L | {c.get(0.5,0)}x0.5L")
        
    print("... Menores Volumes:")
    for v, c in res[-3:]:
        print(f"  {v} L  ->  {c.get(5,0)}x5L | {c.get(2,0)}x2L | {c.get(1,0)}x1L | {c.get(0.5,0)}x0.5L")

run_example(7)
run_example(20)
