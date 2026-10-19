import { render, screen } from '@testing-library/react-native';
import { Wordmark } from './Wordmark';

describe('Wordmark', () => {
  it('renders the word and the Life pill', async () => {
    await render(<Wordmark />);
    expect(screen.getByText('Vitalsy')).toBeTruthy();
    expect(screen.getByText('Life')).toBeTruthy();
  });
});
