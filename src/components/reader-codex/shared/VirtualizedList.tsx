/**
 * ReaderCodex compatibility boundary for DEV's newer shared Reader list.
 * Keep the production Codex views pointed at this adapter instead of copying
 * an older Light-Novels VirtualizedList into the migrated subtree.
 */
export { VirtualizedList } from '../../reader-chamber/development/VirtualizedList';
