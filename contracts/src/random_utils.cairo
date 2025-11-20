/// Idiomatic Pseudo-Random Function (PRF) using Poseidon Hash
///
/// This module provides deterministic pseudo-random generation for Cairo contracts.
/// Perfect for generative art, game mechanics, and any on-chain randomness that must be:
/// - Deterministic (same seed → same output)
/// - Reproducible (verifiable by anyone)
/// - Gas-efficient (uses native Poseidon hash)
///
/// NOT suitable for: Security-critical randomness (use VRF/oracles instead)

use core::poseidon::poseidon_hash_span;

// ============================================================================
// Constants
// ============================================================================

/// Maximum value for normalized random output (represents 1.0 in fixed-point)
const NORMALIZED_MAX: u256 = 1_000_000;

// ============================================================================
// Core PRF Functions
// ============================================================================

/// Generate a pseudo-random felt252 from seed and index
///
/// This is the core PRF using Poseidon hash - Starknet's native hash function.
///
/// # Arguments
/// * `seed` - Base randomness source (e.g., token_id, block_hash)
/// * `index` - Sequence number for generating multiple values from same seed
///
/// # Returns
/// Raw felt252 hash output (full range)
///
/// # Example
/// ```
/// let hash1 = pseudo_random(token_id, 0);
/// let hash2 = pseudo_random(token_id, 1);
/// // hash1 != hash2 (different indices produce different outputs)
/// ```
pub fn pseudo_random(seed: felt252, index: u32) -> felt252 {
    let hash_input: Array<felt252> = array![seed, index.into()];
    poseidon_hash_span(hash_input.span())
}

/// Generate normalized pseudo-random value in range [0, 1000000]
///
/// Maps hash output to [0, 1000000] for easy percentage/ratio calculations.
/// Divide by 1000000 to get value representing 0.0 ~ 1.0
///
/// # Arguments
/// * `seed` - Base randomness source
/// * `index` - Sequence number
///
/// # Returns
/// felt252 in range [0, 1000000] (represents 0.0 ~ 1.0)
///
/// # Example
/// ```
/// let rand = pseudo_random_normalized(token_id, 0);
/// // rand could be 750000 (represents 0.75)
/// // Use: if (rand < 500000) { /* 50% probability */ }
/// ```
pub fn pseudo_random_normalized(seed: felt252, index: u32) -> felt252 {
    let hash = pseudo_random(seed, index);
    let hash_u256: u256 = hash.into();
    let result = hash_u256 % NORMALIZED_MAX;
    result.try_into().unwrap()
}

/// Generate pseudo-random u32 in range [min, max] (inclusive)
///
/// Most commonly used function for practical applications.
///
/// # Arguments
/// * `seed` - Base randomness source
/// * `index` - Sequence number
/// * `min` - Minimum value (inclusive)
/// * `max` - Maximum value (inclusive)
///
/// # Returns
/// u32 in range [min, max]
///
/// # Example
/// ```
/// let font_size = pseudo_random_range(token_id, 0, 10, 20);
/// let x_pos = pseudo_random_range(token_id, 1, 0, 300);
/// let y_pos = pseudo_random_range(token_id, 2, 0, 200);
/// ```
pub fn pseudo_random_range(seed: felt252, index: u32, min: u32, max: u32) -> u32 {
    assert(min <= max, 'min must be <= max');

    let normalized = pseudo_random_normalized(seed, index);
    let normalized_u256: u256 = normalized.into();

    let range = max - min + 1; // +1 to make max inclusive
    let scaled = (normalized_u256 * range.into()) / NORMALIZED_MAX;

    min + scaled.try_into().unwrap()
}

/// Generate pseudo-random boolean with given probability
///
/// # Arguments
/// * `seed` - Base randomness source
/// * `index` - Sequence number
/// * `probability` - Threshold in range [0, 1000000] (0 = never, 1000000 = always)
///
/// # Returns
/// true with given probability
///
/// # Example
/// ```
/// // 50% chance
/// let coin_flip = pseudo_random_bool(token_id, 0, 500000);
///
/// // 25% chance
/// let rare_trait = pseudo_random_bool(token_id, 1, 250000);
/// ```
pub fn pseudo_random_bool(seed: felt252, index: u32, probability: u32) -> bool {
    assert(probability <= 1000000, 'probability must be <= 1000000');

    let rand = pseudo_random_normalized(seed, index);
    let rand_u256: u256 = rand.into();

    rand_u256 < probability.into()
}

// ============================================================================
// Advanced: Multi-seed Hashing
// ============================================================================

/// Generate pseudo-random from multiple seeds
///
/// Useful when combining multiple randomness sources.
///
/// # Example
/// ```
/// // Combine token_id, owner address, and block number
/// let seeds = array![token_id, owner_address, block_number];
/// let combined_random = pseudo_random_multi(seeds.span(), 0);
/// ```
pub fn pseudo_random_multi(seeds: Span<felt252>, index: u32) -> felt252 {
    let mut hash_input: Array<felt252> = array![];

    // Add all seeds
    let mut i = 0;
    while i < seeds.len() {
        hash_input.append(*seeds.at(i));
        i += 1;
    }

    // Add index
    hash_input.append(index.into());

    poseidon_hash_span(hash_input.span())
}
