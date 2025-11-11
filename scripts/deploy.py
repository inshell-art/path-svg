#!/usr/bin/env python3
"""
Deploy PATH_SVG contract to local devnet.
Requires: starknet.py, cairo-lang
"""

import asyncio
import json
from pathlib import Path
from starknet_py.net import FullNodeRpcClient
from starknet_py.net.gateway_client import GatewayChainId
from starknet_py.contract import ContractFunction
from starknet_py.cairo.felt import encode_shortstring

async def main():
    # Setup
    rpc_url = "http://127.0.0.1:5050"
    client = FullNodeRpcClient(node_url=rpc_url)
    
    # Paths
    project_root = Path(__file__).parent.parent
    artifacts_dir = project_root / "contracts" / "target" / "dev"
    contract_file = artifacts_dir / "path_on_chain_PATH_SVG.starknet_artifacts.json"
    hashes_file = project_root / "contract_hashes.json"
    
    print(f"📦 Using contract artifacts from: {contract_file}")
    
    if not contract_file.exists():
        print(f"❌ Contract artifacts not found at {contract_file}")
        print(f"   Run: cd {project_root}/contracts && scarb build")
        return
    
    with open(contract_file) as f:
        artifacts = json.load(f)
    
    sierra_class = artifacts.get("sierra_program") or artifacts.get("program")
    class_hash = artifacts.get("class_hash")
    
    print(f"✓ Contract ready for devnet")
    print(f"  Class Hash: {class_hash}")
    
    # Update contract_hashes.json with placeholder
    hashes_data = {}
    if hashes_file.exists():
        with open(hashes_file) as f:
            hashes_data = json.load(f)
    
    if "devnet" not in hashes_data:
        hashes_data["devnet"] = {}
    
    hashes_data["devnet"]["PATHSVG_class_hash"] = class_hash
    hashes_data["devnet"]["PATHSVG_contract_address"] = "(pending deployment)"
    
    with open(hashes_file, "w") as f:
        json.dump(hashes_data, f, indent=4)
    
    print(f"✓ Updated {hashes_file}")
    print(f"\n🚀 To declare and deploy:")
    print(f"   1. Import a predeployed account from devnet")
    print(f"   2. Run: sncast --profile devnet declare --contract-name PATH_SVG")
    print(f"   3. Run: sncast --profile devnet deploy --class-hash {class_hash}")

if __name__ == "__main__":
    asyncio.run(main())
