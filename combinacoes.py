def find_exact_combinations(Q):
    if Q % 0.5 != 0:
        return []

    target = int(round(Q * 2))
    combinations = []
    
    # limits
    max_d = target // 10 # 5L
    
    for d in range(max_d + 1):
        rem_d = target - (d * 10)
        
        max_c = rem_d // 4 # 2L
        for c in range(max_c + 1):
            rem_c = rem_d - (c * 4)
            
            max_b = rem_c // 2 # 1L
            for b in range(max_b + 1):
                # The remainder must be filled entirely by 0.5L (1 half-liter each)
                a = rem_c - (b * 2)
                combinations.append((a, b, c, d))
                
    return combinations

def run_example(Q):
    combos = find_exact_combinations(Q)
    print(f"\nTotal de combinacoes para Q = {Q}L: {len(combos)}")
    if len(combos) > 0:
        print("Amostra das conversoes (a=0.5L, b=1L, c=2L, d=5L):")
        # Print up to 10 samples
        for i, c in enumerate(combos[:10]):
            print(f" [{i+1}] {c[3]}x5L | {c[2]}x2L | {c[1]}x1L | {c[0]}x0.5L")
        if len(combos) > 10:
            print(" ...")

run_example(6.0)
run_example(180.0)
