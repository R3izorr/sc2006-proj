"""
Quick script to check snapshot data and fix if needed
"""
from dotenv import load_dotenv
from backend.src.db import get_session
from backend.src.repositories import snapshot_repo, subzone_repo

load_dotenv()

def main():
    print("=" * 80)
    print("SNAPSHOT DATA DIAGNOSTIC")
    print("=" * 80)
    
    with get_session() as session:
        # Check for snapshots
        snapshots = snapshot_repo.list_snapshots(session)
        print(f"\n📊 Total snapshots in database: {len(snapshots)}")
        
        if not snapshots:
            print("\n❌ ERROR: No snapshots found in database!")
            print("   Your database is empty. You need to import data first.")
            print("   See: POST /admin/snapshots/refresh endpoint")
            return
        
        print("\nSnapshot Details:")
        for snap in snapshots:
            marker = "✅ CURRENT" if snap.is_current else "  "
            print(f"{marker} ID: {snap.id}")
            print(f"     Created: {snap.created_at}")
            print(f"     Note: {snap.note or 'N/A'}")
            print()
        
        # Check for current snapshot
        current_id = snapshot_repo.get_current_snapshot_id(session)
        
        if not current_id:
            print("\n❌ PROBLEM FOUND: No snapshot is marked as 'current'!")
            print("\n🔧 FIXING: Setting most recent snapshot as current...")
            latest = snapshots[0]  # Already sorted by created_at DESC
            snapshot_repo.set_current_snapshot(session, latest.id)
            print(f"✅ Fixed! Snapshot {latest.id} is now current.")
            current_id = latest.id
        else:
            print(f"\n✅ Current snapshot: {current_id}")
        
        # Test data fetch
        print(f"\n🔍 Testing data fetch from current snapshot...")
        test_subzones = subzone_repo.select_subzones(session, current_id, rank_top=5)
        
        if not test_subzones:
            print("❌ ERROR: Current snapshot has no subzone data!")
            print("   The snapshot exists but contains no subzones.")
            return
        
        print(f"✅ Successfully fetched {len(test_subzones)} subzones")
        print("\nTop 5 subzones by H-Score rank:")
        print("-" * 80)
        print(f"{'Rank':<6} {'Subzone':<30} {'Population':<12} {'H-Score':<10}")
        print("-" * 80)
        for sz in test_subzones:
            rank = sz.get('H_rank', 'N/A')
            name = sz.get('subzone', 'Unknown')[:28]
            pop = sz.get('population', 0)
            h_score = sz.get('H_score', 0)
            print(f"#{rank:<5} {name:<30} {pop:>10,}  {h_score:>8.4f}")
        
        # Test population search
        print("\n🔍 Finding subzone with highest population...")
        all_subzones = subzone_repo.select_subzones(session, current_id, rank_top=332)
        if all_subzones:
            max_pop_subzone = max(all_subzones, key=lambda x: x.get('population', 0))
            print(f"✅ Highest population: {max_pop_subzone['subzone']}")
            print(f"   Population: {max_pop_subzone['population']:,}")
            print(f"   H-Score Rank: #{max_pop_subzone['H_rank']}")
        
        print("\n" + "=" * 80)
        print("DIAGNOSIS COMPLETE")
        print("=" * 80)
        print("\n✅ Your database is configured correctly!")
        print("✅ Chat should now work with these queries:")
        print("   - 'which subzone has the most population?'")
        print("   - 'show me top 5 subzones with most population'")
        print("   - 'which subzone has the highest H_score?'")
        print("\n💡 If chat still doesn't work:")
        print("   1. Check backend console logs for errors")
        print("   2. Make sure Ollama is running: http://localhost:11434")
        print("   3. Restart your backend server")

if __name__ == "__main__":
    main()

