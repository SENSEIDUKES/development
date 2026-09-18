import { InMemoryEnergyRepository } from './inMemoryEnergyRepository';
import { describeEnergyLedgerContract } from './energyLedgerContract';

describeEnergyLedgerContract('in-memory', () => new InMemoryEnergyRepository());
