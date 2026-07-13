import { Input, type InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import cn from '@/utils/cn';

// Styled text field for TanStack Form (v1) on web — the DOM twin of the mobile
// app's components/FormField.tsx. Render it inside a `form.Field` children
// render-prop and pass it the `field`. It shows the label, a shadcn Input, and
// the first validation error once the field has been touched.
//
// The error-extraction block is kept IDENTICAL to mobile so both platforms
// surface Standard-Schema (zod) errors the same way. TanStack Form has no
// FormProvider/useFormContext — the `form` instance is threaded via props/context
// by the owner, and each field is bound here through `field.state`/`field.handle*`.

// Structural type for a TanStack field — only the bits this component uses. Kept
// minimal (not the 20-generic AnyFieldApi) so any string-valued field from any
// form instance is assignable without generic-soup mismatches.
type TextFieldApi = {
  name: string;
  state: {
    value: string;
    meta: { isTouched: boolean; errors: unknown[] };
  };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};

type FormFieldProps = {
  field: TextFieldApi;
  label: string;
  placeholder?: string;
  type?: InputProps['type'];
  inputMode?: InputProps['inputMode'];
  step?: InputProps['step'];
  className?: string;
};

const FormField = ({
  field,
  label,
  placeholder,
  type = 'text',
  inputMode,
  step,
  className,
}: FormFieldProps) => {
  const error =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
      ? // Standard-Schema errors are objects with a `message`; fall back to the
        // raw value if a plain string ever comes through.
        ((field.state.meta.errors[0] as { message?: string })?.message ??
        String(field.state.meta.errors[0]))
      : null;

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        inputMode={inputMode}
        step={step}
        placeholder={placeholder}
        value={field.state.value ?? ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        className={cn(error && 'border-destructive')}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
};

export default FormField;
